# ---------- STAGE 1: Build ----------
    FROM node:current-alpine AS builder

    # Устанавливаем FFmpeg и зависимости
    RUN apk add --no-cache ffmpeg openssl
    
    WORKDIR /app
    
    # Копируем зависимости
    COPY package.json yarn.lock ./
    RUN yarn install --frozen-lockfile
    
    # Копируем исходники
    COPY . .
    
    # Генерируем Prisma Client
    RUN npx prisma generate
    
    # Сборка проекта
    RUN yarn build
    
    # ---------- STAGE 2: Runtime ----------
    FROM node:current-alpine
    
    # Устанавливаем FFmpeg и netcat
    RUN apk add --no-cache ffmpeg openssl netcat-openbsd
    
    WORKDIR /app
    
    # Копируем только необходимые файлы
    COPY --from=builder /app/package.json ./
    COPY --from=builder /app/yarn.lock ./
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/logs ./logs
    
    # Открываем порт
    EXPOSE 6001
    
    # Сбрасываем Prisma и запускаем приложение
    CMD sh -c "until nc -z postgres-stream-db 5432; do sleep 1; done && \
               echo '✅ DB ready, resetting...' && \
               npx prisma migrate reset --force --skip-seed && \
               echo '🚀 Starting app...' && \
               node dist/main"
    