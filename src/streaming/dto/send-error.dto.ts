// src/streams/dto/send-error.dto.ts
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendErrorDto {
  @ApiProperty({
    example: 'Ошибка подключения к RTMP-потоку',
    description: 'Текст ошибки, который будет отправлен в Telegram',
  })
  @IsString()
  @MinLength(5)
  message: string;
}
