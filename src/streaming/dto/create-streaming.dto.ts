import { ApiProperty } from '@nestjs/swagger';

export class CreateStreamDto {
  @ApiProperty({ example: 'DroneCam 1' })
  name: string;

  @ApiProperty({ example: 'rtmp://example.com/live/stream1' })
  rtmpUrl: string;
}
