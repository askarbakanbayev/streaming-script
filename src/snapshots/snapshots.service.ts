import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SnapshotsService implements OnModuleDestroy {
  private snapshotProcesses = new Map<string, ChildProcessWithoutNullStreams>();
  private readonly snapshotDir = path.resolve('snapshots');

  constructor() {
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  startSnapshots(streamId: string, rtspUrl: string, intervalSec = 10) {
    const outputPath = path.join(this.snapshotDir, `${streamId}.jpg`);

    const ffmpeg = spawn('ffmpeg', [
      '-rtsp_transport',
      'tcp',
      '-i',
      rtspUrl,
      '-vf',
      `fps=1/${intervalSec}`,
      '-q:v',
      '2',
      '-update',
      '1',
      '-f',
      'image2',
      outputPath,
    ]);

    this.snapshotProcesses.set(streamId, ffmpeg);

    ffmpeg.stderr.on('data', (data) => {
      console.log(`[SNAPSHOT:${streamId}] ${data.toString()}`);
    });

    ffmpeg.on('exit', (code, signal) => {
      console.log(
        `[❌] Snapshot process for ${streamId} exited (code: ${code}, signal: ${signal})`,
      );
      this.snapshotProcesses.delete(streamId);
    });

    return { message: 'Snapshot started', streamId };
  }

  stopSnapshots(streamId: string) {
    const process = this.snapshotProcesses.get(streamId);
    if (process) {
      process.kill('SIGINT');
      this.snapshotProcesses.delete(streamId);
      return { stopped: true };
    }
    return { stopped: false, reason: 'not running' };
  }

  getLatestSnapshotPath(streamId: string): string | null {
    const files = fs
      .readdirSync(this.snapshotDir)
      .filter((f) => f.startsWith(streamId));
    if (files.length === 0) return null;

    const latest = files.sort().at(-1);
    return latest ? path.join(this.snapshotDir, latest) : null;
  }

  async generateSnapshot(streamId: string, rtspUrl: string): Promise<string> {
    const snapshotPath = path.join(this.snapshotDir, `${streamId}.jpg`);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-rtsp_transport',
        'tcp',
        '-i',
        rtspUrl,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        snapshotPath,
      ]);

      ffmpeg.on('exit', (code) => {
        if (code === 0 && fs.existsSync(snapshotPath)) {
          resolve(snapshotPath);
        } else {
          reject(`Snapshot failed for ${streamId}, code: ${code}`);
        }
      });

      ffmpeg.stderr.on('data', (chunk) => {
        const msg = chunk.toString();
        if (msg.toLowerCase().includes('error')) {
          console.error(`[Snapshot][${streamId}]`, msg.trim());
        }
      });
    });
  }

  onModuleDestroy() {
    this.snapshotProcesses.forEach((proc) => proc.kill('SIGINT'));
  }
}
