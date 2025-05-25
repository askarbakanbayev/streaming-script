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
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stream: ${id}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
        <style>
          :root {
            --primary-color: #ff5733;
            --error-color: #e53935;
            --success-color: #4caf50;
            --border-color: #e0e0e0;
            --bg-color: #f8f9fa;
            --card-bg: #ffffff;
            --text-color: #333333;
            --secondary-text: #666666;
          }
  
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          }
  
          body {
            background-color: var(--bg-color);
            color: var(--text-color);
            min-height: 100vh;
          }
  
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
  
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
  
          .back-button {
            display: flex;
            align-items: center;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            color: var(--text-color);
          }
  
          .stream-info {
            display: flex;
            align-items: center;
            gap: 15px;
          }
  
          .stream-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 24px;
            font-weight: 600;
          }
  
          .status-indicator {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 14px;
            font-weight: 500;
          }
  
          .status-indicator.error {
            color: var(--error-color);
          }
  
          .status-indicator.success {
            color: var(--success-color);
          }
  
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
  
          .status-dot.error {
            background-color: var(--error-color);
          }
  
          .status-dot.success {
            background-color: var(--success-color);
          }
  
          .controls {
            display: flex;
            gap: 10px;
          }
  
          .btn {
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            border: none;
          }
  
          .btn-primary {
            background-color: var(--primary-color);
            color: white;
          }
  
          .btn-outline {
            background-color: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-color);
          }
  
          .btn-outline:hover {
            background-color: rgba(0, 0, 0, 0.05);
          }
  
          .main-content {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 20px;
          }
  
          .video-container {
            background-color: #000;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            aspect-ratio: 16/9;
          }
  
          .video-iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
  
          .error-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            color: white;
            text-align: center;
            padding: 20px;
            background-color: rgba(0, 0, 0, 0.8);
          }
  
          .error-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: rgba(229, 57, 53, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 10px;
          }
  
          .error-icon svg {
            width: 24px;
            height: 24px;
            fill: var(--error-color);
          }
  
          .error-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 5px;
          }
  
          .error-message {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 20px;
          }
  
          .sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
  
          .card {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 20px;
          }
  
          .card-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
          }
  
          .detail-item {
            margin-bottom: 20px;
          }
  
          .detail-label {
            font-size: 14px;
            color: var(--secondary-text);
            margin-bottom: 8px;
          }
  
          .detail-value {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background-color: rgba(0, 0, 0, 0.03);
            padding: 10px 15px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 14px;
          }
  
          .copy-btn {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--secondary-text);
          }
  
          .metrics-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
          }
  
          .metrics-item:last-child {
            border-bottom: none;
          }
  
          .metrics-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
          }
  
          .metrics-value {
            font-size: 14px;
            font-weight: 500;
          }
  
          .metrics-value.error {
            color: var(--error-color);
          }
  
          .metrics-value.offline {
            color: var(--secondary-text);
          }
  
          .tabs {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            margin-top: 30px;
          }
  
          .tab {
            padding: 12px 20px;
            cursor: pointer;
            font-weight: 500;
            color: var(--secondary-text);
            display: flex;
            align-items: center;
            gap: 8px;
          }
  
          .tab.active {
            color: var(--text-color);
            border-bottom: 2px solid var(--primary-color);
          }
  
          /* Logs section styles */
          .tab-content {
            margin-top: 20px;
          }
  
          .tab-pane {
            display: none;
          }
  
          .tab-pane.active {
            display: block;
          }
  
          .logs-container {
            position: relative;
            margin-top: 20px;
          }
  
          .logs-content {
            max-height: 400px;
            overflow: auto;
            border-radius: 8px;
            background-color: #1a1a1a;
            padding: 16px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #e0e0e0;
          }
  
          .log-line {
            white-space: pre-wrap;
            padding: 2px 0;
          }
  
          .live-indicator {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background-color: #FF5722;
            color: white;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 500;
          }
  
          /* Metrics tab content */
          .metrics-container {
            margin-top: 20px;
          }
  
          .metrics-chart {
            background-color: var(--card-bg);
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 20px;
            height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--secondary-text);
          }
  
          @media (max-width: 768px) {
            .main-content {
              grid-template-columns: 1fr;
            }
            
            .header {
              flex-direction: column;
              align-items: flex-start;
              gap: 15px;
            }
            
            .controls {
              width: 100%;
              justify-content: space-between;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="stream-info">
              <button class="back-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="stream-title">
                ${id}
                <div class="status-indicator error" id="status-indicator">
                  <span class="status-dot error"></span>
                  Error
                </div>
              </div>
            </div>
            <div class="controls">
              <button class="btn btn-outline" id="start-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Start
              </button>
              <button class="btn btn-primary" id="restart-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9a9 9 0 0 1 9 9z"/>
                  <path d="M9 12h6"/>
                  <path d="M12 9v6"/>
                </svg>
                Restart Stream
              </button>
            </div>
          </div>
  
          <div class="main-content">
            <div class="video-container">
              <iframe id="stream-iframe" class="video-iframe" src="http://localhost:8889/${id}" allow="autoplay; fullscreen" allowfullscreen></iframe>
              <div class="error-overlay" id="error-overlay" style="display: none;">
                <div class="error-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                  </svg>
                </div>
                <div class="error-title">Error loading stream</div>
                <div class="error-message">Empty SDP answer from WHIP server</div>
                <button class="btn btn-outline" id="retry-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9a9 9 0 0 1 9 9z"/>
                    <path d="M3 12h6"/>
                    <path d="M15 12h6"/>
                    <path d="M12 3v6"/>
                    <path d="M12 15v6"/>
                  </svg>
                  Retry Connection
                </button>
              </div>
            </div>
  
            <div class="sidebar">
              <div class="card">
                <h3 class="card-title">Stream Details</h3>
                
                <div class="detail-item">
                  <div class="detail-label">Stream Name ID</div>
                  <div class="detail-value">
                    ${id}
                    <button class="copy-btn" data-copy="${id}">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
  
                <div class="detail-item">
                  <div class="detail-label">RTMP URL</div>
                  <div class="detail-value">
                    rtmp://rtsp-server:1935/${id}
                    <button class="copy-btn" data-copy="rtmp://rtsp-server:1935/${id}">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
  
                <div class="detail-item">
                  <div class="detail-label">RTSP URL</div>
                  <div class="detail-value">
                    rtsp://localhost:8554/${id}
                    <button class="copy-btn" data-copy="rtsp://localhost:8554/${id}">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
  
              <div class="card">
                <h3 class="card-title">Metrics</h3>
                
                <div class="metrics-item">
                  <div class="metrics-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
                      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                      <line x1="12" y1="20" x2="12.01" y2="20"/>
                    </svg>
                    Status
                  </div>
                  <div class="metrics-value error" id="status-value">Error</div>
                </div>
  
                <div class="metrics-item">
                  <div class="metrics-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Connecting to stream...
                  </div>
                  <div class="metrics-value offline" id="connection-value">Offline</div>
                </div>
              </div>
            </div>
          </div>
  
          <div class="tabs">
            <div class="tab active" data-tab="logs">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Logs
            </div>
            <div class="tab" data-tab="metrics">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4"/>
                <path d="M12 18v4"/>
                <path d="M4.93 4.93l2.83 2.83"/>
                <path d="M16.24 16.24l2.83 2.83"/>
                <path d="M2 12h4"/>
                <path d="M18 12h4"/>
                <path d="M4.93 19.07l2.83-2.83"/>
                <path d="M16.24 7.76l2.83-2.83"/>
              </svg>
              Metrics
            </div>
          </div>
  
          <!-- Tab content -->
          <div class="tab-content">
            <!-- Logs tab -->
            <div id="logs-tab" class="tab-pane active">
              <div class="logs-container">
                <div id="logs-content" class="logs-content">
                  <!-- Logs will be added here dynamically -->
                </div>
                <div class="live-indicator">Live</div>
              </div>
            </div>
  
            <!-- Metrics tab -->
            <div id="metrics-tab" class="tab-pane">
              <div class="metrics-container">
                <div class="metrics-chart">
                  <p>Metrics visualization will be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <script>
          // Stream ID from the server
          const streamId = "${id}";
          
          // DOM Elements
          const streamIframe = document.getElementById('stream-iframe');
          const errorOverlay = document.getElementById('error-overlay');
          const startBtn = document.getElementById('start-btn');
          const restartBtn = document.getElementById('restart-btn');
          const retryBtn = document.getElementById('retry-btn');
          const statusValue = document.getElementById('status-value');
          const connectionValue = document.getElementById('connection-value');
          const statusIndicator = document.getElementById('status-indicator');
          const logsContent = document.getElementById('logs-content');
          const logsTab = document.getElementById('logs-tab');
          const metricsTab = document.getElementById('metrics-tab');
          
          // Log messages array
          const logMessages = [
            "[ffmpeg] Starting stream processing...",
            "[ffmpeg] Input #0, rtmp, from 'rtmp://localhost:1935/live/${id}':",
            "[ffmpeg] Duration: N/A, start: 0.000000, bitrate: N/A",
            "[ffmpeg] Stream #0:0: Video: h264 (High), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], 30 fps, 30 tbr, 1k tbn",
            "[ffmpeg] Stream #0:1: Audio: aac (LC), 48000 Hz, stereo, fltp",
            "[ffmpeg] Output #0, rtsp, to 'rtsp://localhost:8554/${id}':",
            "[ffmpeg] Stream #0:0: Video: h264 (High), yuv420p(progressive), 1920x1080 [SAR 1:1 DAR 16:9], q=2-31, 30 fps, 30 tbr, 90k tbn",
            "[ffmpeg] Stream #0:1: Audio: aac (LC), 48000 Hz, stereo, fltp",
            "[ffmpeg] Press [q] to stop, [?] for help",
            "[ffmpeg] frame=  180 fps= 30 q=-1.0 size=    2048kB time=00:00:06.00 bitrate=2796.4kbits/s speed=1x",
            "[ffmpeg] frame=  360 fps= 30 q=-1.0 size=    4096kB time=00:00:12.00 bitrate=2796.4kbits/s speed=1x",
            "[ffmpeg] frame=  540 fps= 30 q=-1.0 size=    6144kB time=00:00:18.00 bitrate=2796.4kbits/s speed=1x",
            "[ffmpeg] frame=  720 fps= 30 q=-1.0 size=    8192kB time=00:00:24.00 bitrate=2796.4kbits/s speed=1x",
            "[ffmpeg] frame=  900 fps= 30 q=-1.0 size=   10240kB time=00:00:30.00 bitrate=2796.4kbits/s speed=1x",
            "[whip] Establishing WebRTC connection...",
            "[whip] ICE candidate gathering started",
            "[whip] Local SDP offer created",
            "[whip] Sending SDP offer to WHIP endpoint",
            "[whip] Waiting for SDP answer...",
            "[whip] Error: Empty SDP answer from WHIP server",
            "[whip] Connection failed. Please retry."
          ];
          
          // Function to add a log message
          function addLogMessage(message) {
            const logLine = document.createElement('div');
            logLine.className = 'log-line';
            logLine.textContent = message;
            logsContent.appendChild(logLine);
            
            // Auto-scroll to bottom
            logsContent.scrollTop = logsContent.scrollHeight;
          }
          
          // Initialize logs with initial messages
          function initLogs() {
            // Clear existing logs
            logsContent.innerHTML = '';
            
            // Add initial logs (first 7 messages)
            for (let i = 0; i < 7; i++) {
              addLogMessage(logMessages[i]);
            }
            
            // Start adding more logs over time
            let logIndex = 7;
            const logInterval = setInterval(() => {
              if (logIndex < logMessages.length) {
                addLogMessage(logMessages[logIndex]);
                logIndex++;
              } else {
                // Start over with a different pattern once we've shown all logs
                addLogMessage(logMessages[logIndex % logMessages.length].replace(/\\d+/g, (match) => {
                  return parseInt(match) + 100;
                }));
              }
            }, 2000);
            
            return logInterval;
          }
          
          // Copy functionality
          document.querySelectorAll('.copy-btn').forEach(button => {
            button.addEventListener('click', function() {
              const textToCopy = this.getAttribute('data-copy');
              navigator.clipboard.writeText(textToCopy)
                .then(() => {
                  // Show a temporary "Copied!" tooltip or change the icon briefly
                  const originalHTML = this.innerHTML;
                  this.innerHTML = \`
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  \`;
                  setTimeout(() => {
                    this.innerHTML = originalHTML;
                  }, 1500);
                })
                .catch(err => {
                  console.error('Failed to copy text: ', err);
                });
            });
          });
  
          // Tab switching functionality
          document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
              const tabId = this.getAttribute('data-tab');
              
              // Update active tab
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              this.classList.add('active');
              
              // Update active tab content
              document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
              if (tabId === 'logs') {
                logsTab.classList.add('active');
              } else if (tabId === 'metrics') {
                metricsTab.classList.add('active');
              }
            });
          });
  
          // Check iframe load status
          function checkIframeStatus() {
            try {
              // Try to access iframe content - if it fails, show error
              setTimeout(() => {
                try {
                  // This is just a simulation - in reality, you'd check if the iframe loaded correctly
                  const random = Math.random();
                  if (random < 0.3) { // 30% chance of error for demo purposes
                    showErrorState();
                  } else {
                    showConnectedState();
                  }
                } catch (e) {
                  showErrorState();
                }
              }, 2000);
            } catch (e) {
              showErrorState();
            }
          }
          
          // Show error state
          function showErrorState() {
            errorOverlay.style.display = 'flex';
            statusValue.textContent = 'Error';
            statusValue.classList.remove('success');
            statusValue.classList.add('error');
            connectionValue.textContent = 'Offline';
            connectionValue.classList.remove('success');
            connectionValue.classList.add('offline');
            
            // Update status indicator
            statusIndicator.innerHTML = \`
              <span class="status-dot error"></span>
              Error
            \`;
            statusIndicator.className = 'status-indicator error';
            
            // Add error logs
            addLogMessage("[whip] Error: Empty SDP answer from WHIP server");
            addLogMessage("[whip] Connection failed. Please retry.");
          }
          
          // Show connected state
          function showConnectedState() {
            errorOverlay.style.display = 'none';
            statusValue.textContent = 'Connected';
            statusValue.classList.remove('error');
            statusValue.classList.add('success');
            connectionValue.textContent = 'Online';
            connectionValue.classList.remove('offline');
            connectionValue.classList.add('success');
            
            // Update status indicator
            statusIndicator.innerHTML = \`
              <span class="status-dot success"></span>
              Connected
            \`;
            statusIndicator.className = 'status-indicator success';
            
            // Add success logs
            addLogMessage("[whip] SDP answer received");
            addLogMessage("[whip] ICE connection established");
            addLogMessage("[whip] WebRTC connection successful");
            addLogMessage("[ffmpeg] Stream is now being transmitted via WebRTC");
          }
  
          // Retry button functionality
          retryBtn.addEventListener('click', function() {
            this.innerHTML = \`
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9a9 9 0 0 1 9 9z"/>
                <path d="M3 12h6"/>
                <path d="M15 12h6"/>
                <path d="M12 3v6"/>
                <path d="M12 15v6"/>
              </svg>
              Connecting...
            \`;
            
            // Add reconnection logs
            addLogMessage("[whip] Retrying connection...");
            addLogMessage("[whip] Establishing WebRTC connection...");
            
            // Reload the iframe
            streamIframe.src = "http://localhost:8889/" + streamId + "?t=" + new Date().getTime();
            
            // Simulate connection attempt
            setTimeout(() => {
              // 70% chance of success for demo purposes
              if (Math.random() < 0.7) {
                showConnectedState();
              } else {
                showErrorState();
              }
              
              // Reset retry button
              this.innerHTML = \`
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 0 1-9 9a9 9 0 0 1-9-9a9 9 0 0 1 9-9a9 9 0 0 1 9 9z"/>
                  <path d="M3 12h6"/>
                  <path d="M15 12h6"/>
                  <path d="M12 3v6"/>
                  <path d="M12 15v6"/>
                </svg>
                Retry Connection
              \`;
            }, 2000);
          });
          
          // Start button functionality
          startBtn.addEventListener('click', function() {
            // Reload the iframe
            streamIframe.src = "http://localhost:8889/" + streamId + "?t=" + new Date().getTime();
            
            // Add connection logs
            addLogMessage("[system] Starting stream...");
            addLogMessage("[whip] Establishing WebRTC connection...");
            
            // Show connected state
            showConnectedState();
          });
          
          // Restart button functionality
          restartBtn.addEventListener('click', function() {
            // Add restart logs
            addLogMessage("[system] Restarting stream...");
            addLogMessage("[ffmpeg] Process terminated");
            addLogMessage("[ffmpeg] Starting stream processing...");
            
            // Reload the iframe with a cache-busting parameter
            streamIframe.src = "http://localhost:8889/" + streamId + "?restart=" + new Date().getTime();
            
            // Show connected state after a delay
            setTimeout(() => {
              showConnectedState();
            }, 1500);
          });
          
          // Back button functionality
          document.querySelector('.back-button').addEventListener('click', function() {
            window.history.back();
          });
          
          // Initialize the page
          window.addEventListener('DOMContentLoaded', function() {
            initLogs();
            checkIframeStatus();
            
            // Handle iframe load events
            streamIframe.addEventListener('load', function() {
              addLogMessage("[system] Stream iframe loaded");
            });
            
            streamIframe.addEventListener('error', function() {
              addLogMessage("[system] Error loading stream iframe");
              showErrorState();
            });
          });
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
