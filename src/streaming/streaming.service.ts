import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { StreamEntity } from './entities/streaming.entity';
import { StreamSocketsService } from 'src/stream-sockets/stream-sockets.service';
import { SnapshotsService } from 'src/snapshots/snapshots.service';
import { StreamHealthService } from './stream-health.service';
import { BotService } from 'src/bot/bot.service';
import { CreateStreamDto } from './dto/create-streaming.dto';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class StreamsService implements OnModuleDestroy {
  private streams = new Map<string, StreamEntity>();
  private readonly rtspBase = 'rtsp://localhost:8554';
  private readonly MAX_RESTART_ATTEMPTS = 3;

  constructor(
    private readonly socketsService: StreamSocketsService,
    private readonly snapshotService: SnapshotsService,
    private readonly streamHealthService: StreamHealthService,
    private readonly botService: BotService,
    private readonly prisma: PrismaService,
  ) {
    setInterval(() => this.healthCheckStreams(), 10000);
  }

  async startStream(dto: CreateStreamDto): Promise<StreamEntity> {
    const id = dto.name;
    const rtmpUrl = dto.rtmpUrl;
    const rtspUrl = `${this.rtspBase}/${id}`;
    const logPath = path.resolve(`logs/stream-${id}.log`);
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

    const ffmpegArgs: string[] = ['-re', '-i', rtmpUrl];

    ffmpegArgs.push('-vf', `scale=${dto.resolution ?? '1280:720'}`);
    ffmpegArgs.push('-r', String(dto.fps ?? 30));
    ffmpegArgs.push('-c:v', 'libx264');
    ffmpegArgs.push('-preset', 'fast');

    if (dto.disableAudio) {
      ffmpegArgs.push('-an');
    } else {
      ffmpegArgs.push('-c:a', 'aac');
      if (dto.audioBitrate) {
        ffmpegArgs.push('-b:a', dto.audioBitrate);
      }
    }

    if (dto.videoBitrate) {
      ffmpegArgs.push('-b:v', dto.videoBitrate);
    }

    ffmpegArgs.push('-f', 'flv', `rtmp://rtsp-server:1935/${id}`);

    console.log(`[🟡] Запуск ffmpeg для потока ${id}`);
    console.log(`[🔧] Команда: ffmpeg ${ffmpegArgs.join(' ')}`);
    logStream.write(`[🟡] Запуск ffmpeg: ffmpeg ${ffmpegArgs.join(' ')}\n`);

    const ffmpeg: ChildProcessWithoutNullStreams = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.stdout.pipe(logStream);
    ffmpeg.stderr.pipe(logStream);

    // Реальное время — дублируем ошибки в консоль
    ffmpeg.stderr.on('data', (chunk) => {
      const message = chunk.toString();
      if (
        message.toLowerCase().includes('error') ||
        message.toLowerCase().includes('failed')
      ) {
        console.error(`[FFMPEG][${id}] ${message.trim()}`);
      }
    });

    const stream: StreamEntity = {
      id,
      name: id,
      rtmpUrl,
      rtspUrl,
      status: 'starting',
      process: ffmpeg,
      logPath,
      restartAttempts: 0,
    };

    await this.prisma.stream.create({
      data: {
        id,
        name: id,
        rtmpUrl,
        rtspUrl,
        status: 'starting',
        logPath,
        restartAttempts: 0,
      },
    });

    this.snapshotService.startSnapshots(id, rtspUrl);

    ffmpeg.on('spawn', async () => {
      stream.status = 'running';
      console.log(`[✅] ffmpeg для потока ${stream.name} запущен`);
      this.socketsService.emitStreamStatus({
        id: stream.id,
        name: stream.name,
        status: 'running',
        timestamp: new Date().toISOString(),
      });

      const ok = await this.streamHealthService.testRtspStream(rtspUrl);

      if (!ok) {
        const errorMessage = `[❌] Поток ${stream.name} не прошёл RTSP-тест.`;
        console.warn(errorMessage);
        stream.status = 'error';
        stream.process?.kill('SIGINT');
        await this.botService.broadcastError(errorMessage);
        this.socketsService.emitStreamError({
          id: stream.id,
          name: stream.name,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(`[✅] Поток ${stream.name} успешно прошёл RTSP-тест`);
    });

    ffmpeg.on('exit', (code, signal) => {
      stream.status = 'error';
      stream.process = null;
      const message = `[❌] ffmpeg exited (code: ${code}, signal: ${signal})`;
      console.error(message);
      logStream.write(`${message}\n`);
      this.socketsService.emitStreamError({
        id: stream.id,
        name: stream.name,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    ffmpeg.on('error', (err) => {
      stream.status = 'error';
      stream.process = null;
      const message = `[❌] ffmpeg process error: ${err.message}`;
      console.error(message);
      logStream.write(`${message}\n`);
      this.socketsService.emitStreamError({
        id: stream.id,
        name: stream.name,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    this.streams.set(id, stream);
    return stream;
  }

  private healthCheckStreams() {
    for (const [id, stream] of this.streams.entries()) {
      if (
        stream.status === 'error' &&
        stream.restartAttempts < this.MAX_RESTART_ATTEMPTS
      ) {
        const msg = `[↻] Перезапуск потока ${stream.name} (попытка ${stream.restartAttempts + 1})`;
        console.log(msg);

        this.socketsService.emitStreamStatus({
          id: stream.id,
          name: stream.name,
          status: 'restarting',
          timestamp: new Date().toISOString(),
        });

        this.restartStream(id);
      }
    }
  }

  private restartStream(id: string) {
    const old = this.streams.get(id);
    if (!old) return;

    const newProcess = spawn('ffmpeg', [
      '-re',
      '-i',
      old.rtmpUrl,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-f',
      'rtsp',
      '-rtsp_transport',
      'tcp',
      old.rtspUrl,
    ]);

    const logStream = fs.createWriteStream(old.logPath, { flags: 'a' });

    newProcess.stdout.pipe(logStream);
    newProcess.stderr.pipe(logStream);

    old.process = newProcess;
    old.status = 'starting';
    old.restartAttempts += 1;

    newProcess.on('spawn', () => {
      old.status = 'running';
      old.restartAttempts = 0;
      this.socketsService.emitStreamStatus({
        id: old.id,
        name: old.name,
        status: 'running',
        timestamp: new Date().toISOString(),
      });
      console.log(`[✅] Поток ${old.name} успешно перезапущен`);
    });

    newProcess.on('exit', () => {
      old.status = 'error';
      old.process = null;
    });

    newProcess.on('error', () => {
      old.status = 'error';
      old.process = null;
    });
  }

  getStreams(): StreamEntity[] {
    return Array.from(this.streams.values());
  }

  stopStream(id: string): boolean {
    const stream = this.streams.get(id);
    if (!stream) return false;
    stream.status = 'stopped';
    stream.process?.kill('SIGINT');
    this.streams.delete(id);

    this.socketsService.emitStreamStatus({
      id,
      name: stream.name,
      status: 'stopped',
      timestamp: new Date().toISOString(),
    });

    this.snapshotService.stopSnapshots(id);

    return true;
  }

  getLog(id: string): string | null {
    const stream = this.streams.get(id);
    if (!stream) return null;
    return fs.readFileSync(stream.logPath, 'utf-8');
  }

  getMetadata(id: string): Partial<StreamEntity> | null {
    const stream = this.streams.get(id);
    if (!stream) return null;

    return {
      id: stream.id,
      name: stream.name,
      rtmpUrl: stream.rtmpUrl,
      rtspUrl: stream.rtspUrl,
      status: stream.status,
      logPath: stream.logPath,
      restartAttempts: stream.restartAttempts,
      startTime: stream.startTime,
    };
  }

  onModuleDestroy() {
    this.streams.forEach((s) => s.process?.kill('SIGINT'));
  }
}
