#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Updating package lists...${NC}"
apt update -y

echo -e "${YELLOW}🔍 Ensure FFmpeg is installed...${NC}"
if ! command -v ffmpeg &> /dev/null; then
  echo -e "${YELLOW}🔧 Installing FFmpeg...${NC}"
  apt install -y ffmpeg
else
  echo -e "${GREEN}✅ FFmpeg already installed${NC}"
fi

echo -e "${YELLOW}🔍 Ensure Docker is installed...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}🔧 Installing Docker...${NC}"
  apt install -y docker.io
  systemctl enable docker
  systemctl start docker
else
  echo -e "${GREEN}✅ Docker already installed${NC}"
fi

echo -e "${YELLOW}📦 Bringing up the streaming stack with Docker Compose...${NC}"
# (this will stop & remove any old services, then start fresh)
docker-compose down --remove-orphans
docker-compose up -d

echo -e "${GREEN}✅ All containers are up!${NC}"
echo -e "${GREEN}▶️  Stream on RTMP→ rtmp://$(hostname -I | awk '{print $1}'):1935/mystream${NC}"
echo -e "${GREEN}▶️  Stream on RTSP→ rtsp://$(hostname -I | awk '{print $1}'):8554/mystream${NC}"
