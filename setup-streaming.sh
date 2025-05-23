#!/usr/bin/env bash
set -e

echo "🔍 Обновляем пакеты и устанавливаем зависимости…"
apt update
apt install -y ffmpeg docker.io docker-compose

echo "🐳 Останавливаем старые контейнеры (если есть)…"
docker-compose down rtsp-server || true

echo "🐳 Запускаем RTMP/RTSP-сервер…"
docker-compose up -d rtsp-server

echo "✅ Готово! Сервер запущен."
