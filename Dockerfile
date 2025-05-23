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

# Копируем остальной код
COPY . .

# Создаём директорию logs
RUN mkdir -p /app/logs

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем проект
RUN yarn build

# Открываем порт
EXPOSE 6001

# Стартуем
CMD ["node", "dist/main"]
