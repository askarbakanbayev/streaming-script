import { Module } from '@nestjs/common';
import { StreamsController } from './streaming.controller';
import { StreamsService } from './streaming.service';
import { BotModule } from 'src/bot/bot.module';

@Module({
  imports: [BotModule],
  controllers: [StreamsController],
  providers: [StreamsService],
})
export class StreamsModule {}
