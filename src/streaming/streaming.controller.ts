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
        <title>Stream Viewer: ${id}</title>
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
            padding: 20px;
          }
  
          .container {
            max-width: 1200px;
            margin: 0 auto;
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
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
          }
  
          .error-overlay {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            color: white;
            text-align: center;
            padding: 20px;
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
                <div class="status-indicator error">
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
              <div class="error-overlay" id="error-overlay">
                <div class="error-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                  </svg>
                </div>
                <div class="error-title">Error loading logs</div>
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
              <video id="video-player" style="width: 100%; height: 100%; display: none;" autoplay playsinline></video>
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
  
                <button class="btn btn-outline" style="width: 100%;" id="vlc-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v8"/>
                    <path d="m4.93 10.93 1.41 1.41"/>
                    <path d="M2 18h2"/>
                    <path d="M20 18h2"/>
                    <path d="m19.07 10.93-1.41 1.41"/>
                    <path d="M22 22H2"/>
                    <path d="m16 6-4 4-4-4"/>
                    <path d="M16 18a4 4 0 0 0 0-8H8a4 4 0 1 0 0 8"/>
                  </svg>
                  Open VLC
                </button>
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
        </div>
  
        <script>
          // Stream ID from the server
          const streamId = "${id}";
          
          // DOM Elements
          const videoPlayer = document.getElementById('video-player');
          const errorOverlay = document.getElementById('error-overlay');
          const startBtn = document.getElementById('start-btn');
          const restartBtn = document.getElementById('restart-btn');
          const retryBtn = document.getElementById('retry-btn');
          const vlcBtn = document.getElementById('vlc-btn');
          const statusValue = document.getElementById('status-value');
          const connectionValue = document.getElementById('connection-value');
          
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
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              this.classList.add('active');
              // Here you would show/hide content based on the selected tab
            });
          });
  
          // Simulate retry connection functionality
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
            
            // Simulate connection attempt
            setTimeout(() => {
              // For demo purposes, we'll just show the retry button again
              // In a real implementation, you would attempt to reconnect to the WebRTC stream
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
            // In a real implementation, you would start the WebRTC stream here
            // For demo purposes, we'll just toggle the error overlay and video player
            errorOverlay.style.display = 'none';
            videoPlayer.style.display = 'block';
            statusValue.textContent = 'Connected';
            statusValue.classList.remove('error');
            statusValue.classList.add('success');
            connectionValue.textContent = 'Online';
            connectionValue.classList.remove('offline');
            connectionValue.classList.add('success');
          });
          
          // Restart button functionality
          restartBtn.addEventListener('click', function() {
            // In a real implementation, you would restart the WebRTC stream here
            // For demo purposes, we'll just show the error overlay again
            errorOverlay.style.display = 'flex';
            videoPlayer.style.display = 'none';
            statusValue.textContent = 'Error';
            statusValue.classList.remove('success');
            statusValue.classList.add('error');
            connectionValue.textContent = 'Offline';
            connectionValue.classList.remove('success');
            connectionValue.classList.add('offline');
          });
          
          // VLC button functionality
          vlcBtn.addEventListener('click', function() {
            // In a real implementation, you would open the stream in VLC
            // For demo purposes, we'll just log a message
            console.log('Opening stream in VLC: rtsp://localhost:8554/' + streamId);
            alert('Opening stream in VLC: rtsp://localhost:8554/' + streamId);
          });
          
          // Back button functionality
          document.querySelector('.back-button').addEventListener('click', function() {
            // In a real implementation, you would navigate back
            // For demo purposes, we'll just log a message
            console.log('Navigating back');
            window.history.back();
          });
          
          // WebRTC functionality would be implemented here
          // This is a placeholder for actual WebRTC implementation
          function initWebRTC() {
            // This would be where you initialize the WebRTC connection
            console.log('Initializing WebRTC for stream: ' + streamId);
            
            // For demo purposes, we'll just show the error overlay
            errorOverlay.style.display = 'flex';
            videoPlayer.style.display = 'none';
          }
          
          // Initialize the page
          window.addEventListener('DOMContentLoaded', function() {
            initWebRTC();
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
