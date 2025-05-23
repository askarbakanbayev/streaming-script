import { Module } from '@nestjs/common';
import { StreamSocketsService } from './stream-sockets.service';
import { StreamSocketsGateway } from './stream-sockets.gateway';

@Module({
  providers: [StreamSocketsGateway, StreamSocketsService],
  exports: [StreamSocketsService],
})
export class StreamSocketsModule {}
