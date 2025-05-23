import { Module } from '@nestjs/common';
import { StreamsController } from './streaming.controller';
import { StreamsService } from './streaming.service';

@Module({
  controllers: [StreamsController],
  providers: [StreamsService],
})
export class StreamsModule {}
