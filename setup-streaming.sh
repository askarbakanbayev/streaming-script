#!/bin/bash

echo "🔍 Проверка наличия Homebrew..."
if ! command -v brew &> /dev/null; then
    echo "🔧 Установка Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✅ Homebrew уже установлен"
fi

echo "🔍 Проверка наличия FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "🔧 Установка FFmpeg через Homebrew..."
    brew install ffmpeg
else
    echo "✅ FFmpeg уже установлен"
fi

echo "🔍 Проверка наличия Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не найден. Пожалуйста установи Docker с https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "🐳 Запуск локального RTMP-сервера на порту 1935..."
docker run -d --rm --name local-rtmp -p 1935:1935 -p 8080:80 alfg/nginx-rtmp

sleep 2

echo "📡 Генерация тестового RTMP-потока через FFmpeg..."
ffmpeg -re -f lavfi -i testsrc=size=640x360:rate=30 \
       -f lavfi -i sine=frequency=1000 \
       -c:v libx264 -c:a aac \
       -f flv rtmp://localhost/live/stream
