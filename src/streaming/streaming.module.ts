import { Module } from '@nestjs/common';
import { StreamsController } from './streaming.controller';
import { StreamsService } from './streaming.service';
import { BotModule } from 'src/bot/bot.module';
import { StreamSocketsModule } from 'src/stream-sockets/stream-sockets.module';

@Module({
  imports: [BotModule, StreamSocketsModule],
  controllers: [StreamsController],
  providers: [StreamsService],
})
export class StreamsModule {}
