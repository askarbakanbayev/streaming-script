# Используем свежий Node.js на Alpine
FROM node:current-alpine

# Устанавливаем FFmpeg
RUN apk add --no-cache ffmpeg

# Создаём рабочую директорию
WORKDIR /app

# Копируем package.json и lock файл
COPY package.json yarn.lock ./

# Устанавливаем зависимости
RUN yarn install --frozen-lockfile

# Копируем остальной код
COPY . .

# Собираем проект
RUN yarn build

# Открываем порт
EXPOSE 6001

# Стартуем
CMD ["node", "dist/main"]
