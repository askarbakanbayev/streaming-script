import { Module } from '@nestjs/common';
import { StreamsController } from './streaming.controller';
import { StreamsService } from './streaming.service';
import { BotModule } from 'src/bot/bot.module';
import { StreamSocketsModule } from 'src/stream-sockets/stream-sockets.module';
import { GpsModule } from 'src/gps/gps.module';

@Module({
  imports: [BotModule, StreamSocketsModule, GpsModule],
  controllers: [StreamsController],
  providers: [StreamsService],
})
export class StreamsModule {}
