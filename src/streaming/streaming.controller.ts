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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { StreamsService } from './streaming.service';
import { CreateStreamDto } from './dto/create-streaming.dto';
import { StreamDto } from './dto/stream.dto';
import { BotService } from 'src/bot/bot.service';
import { SendErrorDto } from './dto/send-error.dto';

@ApiTags('Streams')
@Controller('streams')
export class StreamsController {
  constructor(
    private readonly streamsService: StreamsService,
    private readonly botService: BotService, // Внедряем
  ) {}

  @Post()
  @ApiOperation({ summary: 'Start a new RTMP → RTSP stream' })
  @ApiResponse({
    status: 201,
    description: 'Stream started successfully',
    type: Object,
  })
  @ApiBody({ type: CreateStreamDto })
  create(@Body() dto: CreateStreamDto) {
    return this.streamsService.startStream(dto.name, dto.rtmpUrl);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of all active streams' })
  @ApiResponse({
    status: 200,
    description: 'List of active streams',
    type: StreamDto,
    isArray: true,
  })
  findAll() {
    return this.streamsService.getStreams();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Stop and remove a stream by ID' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, description: 'Stream stopped successfully' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  remove(@Param('id') id: string) {
    if (!this.streamsService.stopStream(id)) {
      throw new HttpException('Stream not found', HttpStatus.NOT_FOUND);
    }
    return { success: true };
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get FFmpeg logs for a stream' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, description: 'Log file contents as text' })
  @ApiResponse({ status: 404, description: 'Log not found' })
  getLogs(@Param('id') id: string) {
    const log = this.streamsService.getLog(id);
    if (!log) {
      throw new HttpException('Log not found', HttpStatus.NOT_FOUND);
    }
    return log;
  }

  @Post('send-error')
  @ApiBody({ description: 'Send Error to Telegram body', type: SendErrorDto })
  @ApiOperation({ summary: 'Отправить ошибку в Telegram' })
  async sendError(@Body() dto: SendErrorDto) {
    return await this.botService.broadcastError(dto.message);
  }
}
