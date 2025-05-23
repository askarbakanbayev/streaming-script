import { Module } from '@nestjs/common';
import { StreamsController } from './streaming.controller';
import { StreamsService } from './streaming.service';
import { BotModule } from 'src/bot/bot.module';
import { StreamSocketsModule } from 'src/stream-sockets/stream-sockets.module';
import { GpsModule } from 'src/gps/gps.module';
import { SnapshotsModule } from 'src/snapshots/snapshots.module';
import { SnapshotsService } from 'src/snapshots/snapshots.service';

@Module({
  imports: [BotModule, StreamSocketsModule, GpsModule, SnapshotsModule],
  controllers: [StreamsController],
  providers: [StreamsService],
})
export class StreamsModule {}
