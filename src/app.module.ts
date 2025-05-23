import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StreamingModule } from './streaming/streaming.module';

@Module({
  imports: [StreamingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
