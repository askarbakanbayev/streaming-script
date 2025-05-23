// src/streams/dto/streaming.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class StreamDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  rtmpUrl: string;

  @ApiProperty()
  rtspUrl: string;

  @ApiProperty({ enum: ['starting', 'running', 'stopped', 'error'] })
  status: 'starting' | 'running' | 'stopped' | 'error';

  @ApiProperty()
  logPath: string;

  @ApiProperty()
  restartAttempts: number;
}
