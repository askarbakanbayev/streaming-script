// src/streams/streaming.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { StreamEntity } from './entities/streaming.entity';

@Injectable()
export class StreamsService implements OnModuleDestroy {
  private streams = new Map<string, StreamEntity>();
  private readonly rtspBase = 'rtsp://localhost:8554';

  startStream(name: string, rtmpUrl: string): StreamEntity {
    const id = uuidv4();
    const rtspUrl = `${this.rtspBase}/stream-${id}`;
    const logPath = path.resolve(`logs/stream-${id}.log`);
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });

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
    };

    ffmpeg.on('spawn', () => (stream.status = 'running'));
    ffmpeg.on('exit', () => (stream.status = 'stopped'));
    ffmpeg.on('error', () => (stream.status = 'error'));

    this.streams.set(id, stream);
    return stream;
  }

  getStreams(): StreamEntity[] {
    return Array.from(this.streams.values());
  }

  stopStream(id: string): boolean {
    const stream = this.streams.get(id);
    if (!stream) return false;
    stream.process.kill('SIGINT');
    this.streams.delete(id);
    return true;
  }

  getLog(id: string): string | null {
    const stream = this.streams.get(id);
    if (!stream) return null;
    return fs.readFileSync(stream.logPath, 'utf-8');
  }

  onModuleDestroy() {
    this.streams.forEach((s) => s.process.kill('SIGINT'));
  }
}
