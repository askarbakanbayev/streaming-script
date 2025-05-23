import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;
  private readonly adminChatIds: string[];

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('BOT_TOKEN');
    const raw = this.configService.get<string>('ADMIN_CHAT_IDS') || '';
    this.adminChatIds = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!token || this.adminChatIds.length === 0) {
      throw new Error(
        'BOT_TOKEN or ADMIN_CHAT_IDS is not defined in environment variables',
      );
    }
    this.bot = new Telegraf(token);
  }

  onModuleInit() {
    this.setup();
  }

  private async setup() {
    // Обработка /start для всех пользователей — и админов, и обычных
    this.bot.start((ctx) => {
      ctx.reply(
        `👋 Привет, ${ctx.from.first_name || 'друг'}!\n\n` +
          `Это бот конвертера RTMP → RTSP.\n` +
          `Все технические уведомления будут приходить администраторам.`,
      );
      // При желании можно сохранять chat.id в базу, чтобы потом рассылать обновления
    });

    // Пример команды /stats
    this.bot.command('stats', (ctx) => {
      ctx.reply('Здесь будут текущие метрики потоков...');
    });

    await this.bot.launch();
    console.log('Bot started');
  }

  /** Рассылает одно сообщение всем админам */
  async broadcastError(message: string) {
    const text = `🚨 *Ошибка конвертера*: ${message}`;
    for (const chatId of this.adminChatIds) {
      try {
        await this.bot.telegram.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
        });
      } catch (err) {
        console.error(
          `Не удалось отправить сообщение администратору ${chatId}:`,
          err,
        );
      }
    }
  }
}
