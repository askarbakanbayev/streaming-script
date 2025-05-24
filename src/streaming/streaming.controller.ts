import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { StreamsService } from './streaming.service';
import { StreamDto } from './dto/stream.dto';
import { BotService } from 'src/bot/bot.service';
import { SendErrorDto } from './dto/send-error.dto';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { Response } from 'express';
import { CreateStreamDto } from './dto/create-streaming.dto';

@ApiTags('Streams')
@Controller('streams')
export class StreamsController {
  constructor(
    private readonly streamsService: StreamsService,
    private readonly botService: BotService,
  ) {}

  @Post('notify')
  @ApiOperation({
    summary: 'Notify server of incoming RTMP stream (auto convert to RTSP)',
  })
  @ApiBody({
    type: CreateStreamDto,
  })
  @ApiResponse({ status: 201, description: 'Conversion started' })
  notifyIncomingStream(@Body() dto: CreateStreamDto) {
    return this.streamsService.startStream(dto);
  }

  @Get(':id/logs/download')
  @ApiOperation({ summary: 'Download the log file for a stream' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, description: 'Log file as download' })
  @ApiResponse({ status: 404, description: 'Log file not found' })
  downloadLog(@Param('id') id: string, @Res() res: Response) {
    const logPath = join(process.cwd(), `logs/stream-${id}.log`);

    if (!existsSync(logPath)) {
      throw new HttpException('Log file not found', HttpStatus.NOT_FOUND);
    }

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="stream-${id}.log"`,
    );
    res.setHeader('Content-Type', 'text/plain');

    const fileStream = createReadStream(logPath);
    fileStream.pipe(res);
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

  @Get(':id/snapshot')
  @ApiOperation({ summary: 'Get the latest snapshot of a stream' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, description: 'Image/jpeg snapshot' })
  @ApiResponse({ status: 404, description: 'Snapshot not found' })
  getSnapshot(@Param('id') id: string, @Res() res: Response) {
    const filePath = join(process.cwd(), 'snapshots', `${id}.jpg`);

    if (!existsSync(filePath)) {
      throw new HttpException('Snapshot not found', HttpStatus.NOT_FOUND);
    }

    res.setHeader('Content-Type', 'image/jpeg');
    createReadStream(filePath).pipe(res);
  }

  @Get(':id/play')
  @ApiOperation({ summary: 'Get RTSP play command (VLC/ffplay)' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, description: 'Command to play stream' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  getPlayCommand(@Param('id') id: string) {
    const metadata = this.streamsService.getMetadata(id);
    if (!metadata) {
      throw new HttpException('Stream not found', HttpStatus.NOT_FOUND);
    }

    return {
      rtspUrl: metadata.rtspUrl,
      ffplay: `ffplay ${metadata.rtspUrl}`,
      vlc: `vlc ${metadata.rtspUrl}`,
      sdp: `v=0
o=- 0 0 IN IP4 127.0.0.1
s=RTSP Stream
c=IN IP4 127.0.0.1
t=0 0
m=video 8554 RTP/AVP 96
a=rtpmap:96 H264/90000`,
    };
  }

  @Get(':id/metadata')
  @ApiOperation({ summary: 'Get metadata for a stream' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({
    status: 200,
    description: 'Stream metadata',
    type: StreamDto,
  })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  getMetadata(@Param('id') id: string) {
    const metadata = this.streamsService.getMetadata(id);
    if (!metadata) {
      throw new HttpException('Stream not found', HttpStatus.NOT_FOUND);
    }
    return metadata;
  }

  @Get(':id/webrtc')
  @ApiOperation({ summary: 'Get WebRTC viewer page for the stream' })
  @ApiParam({ name: 'id', description: 'Stream ID' })
  @ApiResponse({ status: 200, description: 'WebRTC playback page HTML' })
  @ApiResponse({ status: 404, description: 'Stream not found' })
  getWebRTCPlayer(@Param('id') id: string, @Res() res: Response) {
    const metadata = this.streamsService.getMetadata(id);
    if (!metadata) {
      throw new HttpException('Stream not found', HttpStatus.NOT_FOUND);
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>WebRTC Stream: ${id}</title>
    </head>
    <body>
      <h1>Stream: ${id}</h1>
      <video id="video" autoplay playsinline controls muted width="720" height="480"></video>
      <script>
        const video = document.getElementById("video");
        const pc = new RTCPeerConnection();
  
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });
  
        pc.ontrack = function(event) {
          video.srcObject = event.streams[0];
        };
  
        async function start() {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
  
            const response = await fetch("http://localhost:8889/whip/${id}", {
              method: "POST",
              body: pc.localDescription.sdp,
              headers: { "Content-Type": "application/sdp" }
            });
  
            const answerSdp = await response.text();
            await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
          } catch (err) {
            console.error("WebRTC WHIP error:", err);
          }
        }
  
        start();
      </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Post('send-error')
  @ApiBody({ description: 'Send Error to Telegram body', type: SendErrorDto })
  @ApiOperation({ summary: 'Отправить ошибку в Telegram' })
  async sendError(@Body() dto: SendErrorDto) {
    return await this.botService.broadcastError(dto.message);
  }
}
