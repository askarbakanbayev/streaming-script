FROM --platform=linux/amd64 node:22-slim

# Устанавливаем нужные пакеты
RUN apt-get update && apt-get install -y ffmpeg openssl && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Установка зависимостей
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Копируем остальной код
COPY . .

# Генерация Prisma Client
RUN yarn prisma generate

# Сборка проекта
RUN yarn build

# Открываем порт
EXPOSE 6001

# Запуск
CMD ["yarn", "start:prod"]