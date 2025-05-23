#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Проверка наличия Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}🔧 Установка Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}✅ Homebrew уже установлен${NC}"
fi

echo -e "${YELLOW}🔍 Проверка наличия FFmpeg...${NC}"
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}🔧 Установка FFmpeg через Homebrew...${NC}"
    brew install ffmpeg
else
    echo -e "${GREEN}✅ FFmpeg уже установлен${NC}"
fi

echo -e "${YELLOW}🔍 Проверка наличия Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}❌ Docker не найден. Пожалуйста установи Docker с https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi

echo -e "${YELLOW}🐳 Запуск локального RTMP-сервера на порту 1935...${NC}"
docker rm -f local-rtmp &>/dev/null
docker run -d --name local-rtmp -p 1935:1935 -p 8080:80 alfg/nginx-rtmp
sleep 3

echo -e "${YELLOW}📡 Генерация беззвучного RTMP-потока через FFmpeg...${NC}"
ffmpeg -re -f lavfi -i testsrc=size=640x360:rate=30 \
       -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 \
       -c:v libx264 -c:a aac -strict -2 \
       -f flv rtmp://localhost:1935/stream
