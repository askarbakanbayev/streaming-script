import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { StreamEntity } from './entities/streaming.entity';
import { StreamSocketsService } from 'src/stream-sockets/stream-sockets.service';
import { GpsService } from 'src/gps/gps.service';
import { SnapshotsService } from 'src/snapshots/snapshots.service';

@Injectable()
export class StreamsService implements OnModuleDestroy {
  private streams = new Map<string, StreamEntity>();
  private readonly rtspBase = 'rtsp://localhost:8554';
  private readonly MAX_RESTART_ATTEMPTS = 3;

  constructor(
    private readonly socketsService: StreamSocketsService,
    private readonly gpsService: GpsService,
    private readonly snapshotService: SnapshotsService,
  ) {
    setInterval(() => this.healthCheckStreams(), 10000);
  }

  startStream(name: string, rtmpUrl: string): StreamEntity {
    const id = uuidv4();
    const rtspUrl = `${this.rtspBase}/stream-${id}`;
    const logPath = path.resolve(`logs/stream-${id}.log`);
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

    // Попробуем сразу отправить GPS, если он уже есть
    const gps = this.gpsService.findOne(id);
    if (gps) {
      this.socketsService.emitGpsPosition({
        streamId: id,
        lat: gps.lat,
        lng: gps.lng,
        altitude: gps.altitude,
        speed: gps.speed,
        timestamp: new Date().toISOString(),
      });
    }

    const ffmpeg: ChildProcessWithoutNullStreams = spawn('ffmpeg', [
      '-re',
      '-i',
      rtmpUrl,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-f',
      'rtsp',
      '-rtsp_transport',
      'tcp',
      rtspUrl,
    ]);

    ffmpeg.stdout.pipe(logStream);
    ffmpeg.stderr.pipe(logStream);

    const stream: StreamEntity = {
      id,
      name,
      rtmpUrl,
      rtspUrl,
      status: 'starting',
      process: ffmpeg,
      logPath,
      restartAttempts: 0,
    };

    this.snapshotService.startSnapshots(stream.id, rtspUrl);

    ffmpeg.on('spawn', () => {
      stream.status = 'running';
      stream.restartAttempts = 0;
      this.socketsService.emitStreamStatus({
        id: stream.id,
        name: stream.name,
        status: 'running',
        timestamp: new Date().toISOString(),
      });
    });

    ffmpeg.on('exit', (code) => {
      if (stream.status !== 'stopped') {
        stream.status = 'error';
        stream.process = null;

        const msg = `[!] Поток ${stream.name} завершился неожиданно (код ${code})`;
        console.warn(msg);

        this.socketsService.emitStreamError({
          id: stream.id,
          name: stream.name,
          message: msg,
          timestamp: new Date().toISOString(),
        });
      }
    });

    ffmpeg.on('error', (error) => {
      stream.status = 'error';
      stream.process = null;

      const msg = `[❌] Ошибка процесса ffmpeg потока ${stream.name}`;
      console.error(msg);

      this.socketsService.emitStreamError({
        id: stream.id,
        name: stream.name,
        message: msg,
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

  onModuleDestroy() {
    this.streams.forEach((s) => s.process?.kill('SIGINT'));
  }
}
