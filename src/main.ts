// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { BotService } from './bot/bot.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('RTMP → RTSP Converter')
    .setDescription('API for managing live stream conversions')
    .setVersion('1.0')
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, doc);

  await app.listen(6001);

  const botService = app.get(BotService);
  await botService.logInfo('🚀 Сервер RTMP → RTSP запущен на порту 6001');
}

bootstrap();
