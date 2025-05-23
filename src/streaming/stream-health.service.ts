// src/streaming/stream-health.service.ts

import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';

@Injectable()
export class StreamHealthService {
  async testRtspStream(rtspUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = `ffprobe -v error -show_streams -of json "${rtspUrl}"`;

      exec(cmd, { timeout: 5000 }, (error, stdout) => {
        if (error) {
          console.warn(`[⚠️] RTSP test failed: ${error.message}`);
          return resolve(false);
        }

        try {
          const parsed = JSON.parse(stdout);
          const hasVideo = parsed.streams?.some(
            (s: any) => s.codec_type === 'video',
          );
          resolve(!!hasVideo);
        } catch {
          resolve(false);
        }
      });
    });
  }
}
