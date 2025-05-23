import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StreamsModule } from './streaming/streaming.module';
import { BotModule } from './bot/bot.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StreamSocketsModule } from './stream-sockets/stream-sockets.module';
import { GpsModule } from './gps/gps.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SharedModule,
    StreamsModule,
    BotModule,
    StreamSocketsModule,
    GpsModule,
    SnapshotsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
