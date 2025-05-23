#!/usr/bin/env bash
set -e

echo "🔍 Обновляем пакеты и устанавливаем зависимости…"
apt update
apt install -y ffmpeg docker.io docker-compose

echo "🗑 Удаляем старые контейнеры и орфанов (если есть)…"
# убираем старый rtsp-server
docker rm -f rtsp-server || true
# чистим орфанов
docker-compose down --remove-orphans

echo "🐳 Запускаем RTMP/RTSP-сервер…"
docker-compose up -d rtsp-server

echo "✅ Готово! Сервер запущен."
