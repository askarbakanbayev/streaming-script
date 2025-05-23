import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStreamDto {
  @ApiProperty({
    example: 'DroneCam 1',
    description: 'Имя потока (идентификатор)',
  })
  name: string;

  @ApiProperty({
    example: 'rtmp://example.com/stream1',
    description: 'RTMP URL источника потока',
  })
  rtmpUrl: string;

  @ApiPropertyOptional({
    example: '1280x720',
    description: 'Разрешение выходного видео, например: 1920x1080, 1280x720',
  })
  resolution?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Частота кадров (FPS), например: 24, 30, 60',
  })
  fps?: number;

  @ApiPropertyOptional({
    example: '2000k',
    description: 'Битрейт видео, например: 1000k, 2500k',
  })
  videoBitrate?: string;

  @ApiPropertyOptional({
    example: '128k',
    description: 'Битрейт аудио, например: 64k, 128k',
  })
  audioBitrate?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Отключить аудио entirely (true — без аудио)',
  })
  disableAudio?: boolean;
}
