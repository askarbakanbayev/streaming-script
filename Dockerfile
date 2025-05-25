# ---------- STAGE 1: BUILD ----------
    FROM node:current-alpine AS builder

    # Устанавливаем зависимости
    RUN apk add --no-cache ffmpeg openssl
    
    # Рабочая директория
    WORKDIR /app
    
    # Устанавливаем зависимости
    COPY package.json yarn.lock ./
    RUN yarn install --frozen-lockfile
    
    # Копируем исходники
    COPY . .
    
    # Генерируем Prisma Client
    RUN npx prisma generate
    
    # Сборка проекта
    RUN yarn build
    
    # Проверка наличия main.js
    RUN test -f dist/src/main.js || (echo "❌ dist/main.js не найден" && exit 1)
    
    
    # ---------- STAGE 2: RUNTIME ----------
    FROM node:current-alpine
    
    # Устанавливаем только нужные зависимости
    RUN apk add --no-cache ffmpeg openssl netcat-openbsd
    
    WORKDIR /app
    
    # Копируем только нужные артефакты
    COPY --from=builder /app/package.json ./
    COPY --from=builder /app/yarn.lock ./
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/dist ./dist
    
    # Создаём директории под логи и превью
    RUN mkdir -p ./logs ./snapshots
    
    # Открываем порт приложения
    EXPOSE 6001
    
    # Запуск приложения (с проверкой PostgreSQL)
    CMD sh -c "until nc -z postgres-stream-db 5432; do echo '⏳ Ждём БД...'; sleep 1; done && \
      echo '✅ DB ready, migrating...' && \
      npx prisma migrate deploy && \
      echo '🚀 Starting app...' && \
      node dist/src/main.js"
    