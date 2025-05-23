# Используем свежий Node.js на Alpine
FROM node:current-alpine

# Устанавливаем FFmpeg и необходимые зависимости
RUN apk add --no-cache ffmpeg openssl

# Создаём рабочую директорию
WORKDIR /app

# Копируем package.json и lock файл
COPY package.json yarn.lock ./

# Устанавливаем зависимости
RUN yarn install --frozen-lockfile

# Копируем остальной код (включая prisma, src и logs)
COPY . .

# Создаём директорию logs, если она вдруг не была скопирована
RUN mkdir -p /app/logs

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем проект
RUN yarn build

# Открываем порт
EXPOSE 6001

# Выполняем миграции и запускаем приложение
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
