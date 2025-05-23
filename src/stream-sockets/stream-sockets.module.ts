import { Module } from '@nestjs/common';
import { StreamSocketsService } from './stream-sockets.service';
import { StreamSocketsGateway } from './stream-sockets.gateway';
import { GpsService } from 'src/gps/gps.service';

@Module({
  providers: [StreamSocketsGateway, StreamSocketsService, GpsService],
  exports: [StreamSocketsService],
})
export class StreamSocketsModule {}
