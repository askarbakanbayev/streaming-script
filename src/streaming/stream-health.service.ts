// src/streaming/stream-health.service.ts

import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';

@Injectable()
export class StreamHealthService {
  async testRtmpStream(rtmpUrl: string): Promise<boolean> {
    console.log(`[🔍] Проверка RTMP потока через ffprobe: ${rtmpUrl}`);
    return new Promise((resolve) => {
      const cmd = `ffprobe -v error -show_streams -of json "${rtmpUrl}"`;

      exec(cmd, { timeout: 5000 }, (error, stdout) => {
        if (error) {
          console.warn(
            `[⚠️] ffprobe не смог подключиться к ${rtmpUrl}: ${error.message}`,
          );
          return resolve(false);
        }

        try {
          const parsed = JSON.parse(stdout);
          const hasVideo = parsed.streams?.some(
            (s: any) => s.codec_type === 'video',
          );

          if (hasVideo) {
            console.log(`[✅] RTMP ${rtmpUrl} содержит видеопоток`);
          } else {
            console.warn(`[⚠️] RTMP ${rtmpUrl} не содержит видео`);
          }

          resolve(!!hasVideo);
        } catch (e) {
          console.warn(`[⚠️] Ошибка парсинга ffprobe (RTMP): ${e}`);
          resolve(false);
        }
      });
    });
  }

  async isPublishing(rtmpUrl: string): Promise<boolean> {
    const streamKey = rtmpUrl.split('/').pop() ?? '';
    console.log(
      `[🔍] Проверка публикации RTMP: ${rtmpUrl} (ключ: ${streamKey})`,
    );

    try {
      const res = await fetch('http://rtsp-server:9997/v3/paths/list');
      const json = await res.json();

      const isActive =
        json.items &&
        Array.isArray(json.items) &&
        json.items.some((item: any) => item.name === streamKey);

      if (isActive) {
        console.log(`[✅] RTMP поток "${streamKey}" публикуется`);
      } else {
        console.warn(`[⚠️] RTMP поток "${streamKey}" не найден в списке paths`);
      }

      return isActive;
    } catch (e) {
      console.error(`[❌] Ошибка запроса к RTSP-серверу: ${e}`);
      return false;
    }
  }
}
