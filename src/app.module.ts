import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StreamsModule } from './streaming/streaming.module';
import { BotModule } from './bot/bot.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StreamSocketsModule } from './stream-sockets/stream-sockets.module';
import { GpsModule } from './gps/gps.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StreamsModule,
    BotModule,
    StreamSocketsModule,
    GpsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
