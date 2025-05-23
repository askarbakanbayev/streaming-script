import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StreamsModule } from './streaming/streaming.module';

@Module({
  imports: [StreamsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
