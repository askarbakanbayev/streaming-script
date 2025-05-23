// src/streams/streaming.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StreamsService } from './streaming.service';
import { CreateStreamDto } from './dto/create-streaming.dto';

@ApiTags('Streams')
@Controller('streams')
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Post()
  create(@Body() dto: CreateStreamDto) {
    return this.streamsService.startStream(dto.name, dto.rtmpUrl);
  }

  @Get()
  findAll() {
    return this.streamsService.getStreams();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    if (!this.streamsService.stopStream(id)) {
      throw new HttpException('Stream not found', HttpStatus.NOT_FOUND);
    }
    return { success: true };
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string) {
    const log = this.streamsService.getLog(id);
    if (!log) {
      throw new HttpException('Log not found', HttpStatus.NOT_FOUND);
    }
    return log;
  }
}
