# ---------- STAGE 1: Build ----------
    FROM node:current-alpine AS builder

    RUN apk add --no-cache ffmpeg openssl
    
    WORKDIR /app
    
    COPY package.json yarn.lock ./
    RUN yarn install --frozen-lockfile
    
    COPY . .
    
    RUN npx prisma generate
    RUN yarn build
    
    # ---------- STAGE 2: Runtime ----------
    FROM node:current-alpine
    
    RUN apk add --no-cache ffmpeg openssl netcat-openbsd
    
    WORKDIR /app
    
    COPY --from=builder /app/package.json ./
    COPY --from=builder /app/yarn.lock ./
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/dist ./dist
    
    # ✅ Создаём пустую директорию для логов
    RUN mkdir -p ./logs
    
    EXPOSE 6001
    
    CMD sh -c "until nc -z postgres-stream-db 5432; do sleep 1; done && \
               echo '✅ DB ready, resetting...' && \
               npx prisma migrate reset --force --skip-seed && \
               echo '🚀 Starting app...' && \
               node dist/main"
    