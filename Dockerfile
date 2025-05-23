# Используем самую свежую версию Node.js (alpine)
FROM node:current-alpine

# Устанавливаем FFmpeg
RUN apk add --no-cache ffmpeg

# Создаём рабочую директорию
WORKDIR /app

# Копируем и устанавливаем зависимости через Yarn
COPY package.json yarn.lock ./
RUN yarn install

# Копируем остальные файлы проекта
COPY . .

# Собираем проект
RUN yarn build

# Открываем порт
EXPOSE 6001

# Запускаем приложение
CMD ["node", "dist/main"]
