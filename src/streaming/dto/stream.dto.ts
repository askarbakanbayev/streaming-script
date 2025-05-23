import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StreamDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  rtmpUrl: string;

  @ApiProperty()
  rtspUrl: string;

  @ApiProperty({
    enum: ['starting', 'running', 'stopped', 'error', 'restarting'],
  })
  status: 'starting' | 'running' | 'stopped' | 'error' | 'restarting';

  @ApiProperty()
  logPath: string;

  @ApiProperty()
  restartAttempts: number;

  // 🧠 Новое:
  @ApiPropertyOptional({ description: 'Время запуска потока в ISO формате' })
  startTime?: string;

  @ApiPropertyOptional({ description: 'Последняя проверка потока (RTSP test)' })
  lastHealthCheck?: string;

  @ApiPropertyOptional({
    description: 'Разрешение видеопотока (например, 1280x720)',
  })
  resolution?: string;

  @ApiPropertyOptional({ description: 'Кадров в секунду (FPS)' })
  fps?: number;

  @ApiPropertyOptional({ description: 'Видеобитрейт, например 1500k' })
  videoBitrate?: string;

  @ApiPropertyOptional({ description: 'Аудиобитрейт, например 128k' })
  audioBitrate?: string;

  @ApiPropertyOptional({ description: 'Аудио отключено' })
  disableAudio?: boolean;

  @ApiPropertyOptional({ description: 'Флаг прохождения RTSP теста' })
  isHealthy?: boolean;
}
