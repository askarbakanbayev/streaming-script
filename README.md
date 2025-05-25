# Streaming Script - Quick Setup Guide

This guide explains how to quickly set up and run the Streaming Script system for RTMP to RTSP conversion.

## Prerequisites

- Docker and Docker Compose
- FFmpeg (for local development)
- Node.js and Yarn

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd streaming-script
```

### 2. Environment Setup

Copy the example environment file and modify as needed:

```bash
cp .env.example .env
```

Edit the `.env` file to configure:
- Telegram Bot Token (for notifications)
- Database credentials
- Other environment-specific settings

### 3. Start the System

#### Using Docker (Recommended)

```bash
docker-compose up -d
```

This will start all required services:
- PostgreSQL database
- RTSP server (MediaMTX)
- FFmpeg simulator (for testing)
- Backend service
- Prometheus and Grafana for monitoring

#### For Mac Users

Use the provided setup script:

```bash
./setup-streaming-mac.sh
```

#### For Local Development

```bash
yarn install
yarn start:dev
```

## Using the System

### Via CLI

The system includes a command-line interface for easy management:

```bash
# Start a new stream
yarn cli start -n stream1 -r rtmp://source-server/live/stream

# List all active streams
yarn cli list

# Stop a stream
yarn cli stop stream1

# Get stream metadata
yarn cli metadata stream1

# Open WebRTC viewer
yarn cli webrtc stream1

# Send error message to Telegram
yarn cli error "Test error message"
```

### Via API

The API is available at `http://localhost:6001` with these endpoints:

- `POST /streams` - Start a new stream
- `GET /streams` - List all streams
- `DELETE /streams/:id` - Stop a stream
- `GET /streams/:id/metadata` - Get stream metadata
- `GET /streams/:id/webrtc` - WebRTC viewer URL

API documentation is available at `http://localhost:6001/api`

## How It Works

1. **Stream Conversion**: The system takes RTMP input streams and converts them to RTSP using FFmpeg
2. **MediaMTX**: Acts as the RTSP/RTMP server for handling the streams
3. **Health Monitoring**: Automatic health checks ensure streams are running properly
4. **Notifications**: Telegram integration provides real-time alerts
5. **WebSockets**: Real-time updates on stream status

## Monitoring

- Prometheus metrics: `http://localhost:9090`
- Grafana dashboards: `http://localhost:3030` (admin/admin)

## Troubleshooting

- Check logs: `docker-compose logs -f backend`
- Stream logs are stored in the `logs/` directory
- Verify RTMP source is accessible
- Ensure ports 6001, 1935, and 8554 are available

## Configuration

The `mediamtx.yml` file configures the RTSP server:
- API settings
- Stream paths
- On-demand stream settings

The system automatically restarts failed streams up to 3 times before giving up.
