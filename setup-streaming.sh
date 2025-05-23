# setup-streaming-linux.sh
#!/usr/bin/env bash
set -e

echo "🔍 Обновляем apt и ставим зависимости…"
apt update
apt install -y ffmpeg docker.io docker-compose

echo "🐳 Запускаем RTMP/RTSP-сервер через docker-compose…"
docker-compose up -d rtsp-server

echo "✅ Готово! Теперь можно тестово стримить…"
