#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Updating package lists...${NC}"
apt update -y

echo -e "${YELLOW}🔍 Проверка наличия FFmpeg...${NC}"
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}🔧 Установка FFmpeg через apt...${NC}"
    apt install -y ffmpeg
else
    echo -e "${GREEN}✅ FFmpeg уже установлен${NC}"
fi

echo -e "${YELLOW}🔍 Проверка наличия Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}🔧 Установка Docker через apt...${NC}"
    apt install -y docker.io
    systemctl enable docker
    systemctl start docker
else
    echo -e "${GREEN}✅ Docker уже установлен${NC}"
fi

echo -e "${YELLOW}🐳 Удаляем старый контейнер local-rtmp (если есть)...${NC}"
docker rm -f local-rtmp &>/dev/null || true

echo -e "${YELLOW}🐳 Запуск локального RTMP-сервера на порту 1935...${NC}"
docker run -d --name local-rtmp -p 1935:1935 -p 8080:80 alfg/nginx-rtmp

# give it a moment to spin up
sleep 3

VIDEO_PATH="./videos/car.mp4"
if [ ! -f "$VIDEO_PATH" ]; then
  echo -e "${RED}❌ Видео не найдено по пути $VIDEO_PATH${NC}"
  exit 1
fi

echo -e "${YELLOW}📡 Стрим видео ${VIDEO_PATH} через FFmpeg...${NC}"
ffmpeg -re -i "$VIDEO_PATH" \
       -c:v libx264 -c:a aac -strict -2 \
       -f flv rtmp://localhost:1935/stream

echo -e "${GREEN}✅ Готово! Стрим идёт на rtmp://$(hostname -I | awk '{print $1}'):1935/stream${NC}"
