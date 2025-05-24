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
    // Обработка /start
    this.bot.start((ctx) => {
      ctx.reply(
        `👋 Привет, ${ctx.from.first_name || 'друг'}!\n\n` +
          `Это бот конвертера RTMP → RTSP.\n` +
          `Все технические уведомления будут приходить администраторам.`,
      );
    });

    // Пример команды /stats
    this.bot.command('stats', (ctx) => {
      ctx.reply('Здесь будут текущие метрики потоков...');
    });

    await this.bot.launch();
    console.log('🤖 Bot started');
  }

  async broadcastError(message: string) {
    await this.logError(`Ошибка конвертера: ${message}`);
  }

  async logInfo(message: string) {
    await this.sendToAdmins(`ℹ️ *Info:* ${this.escapeMarkdown(message)}`);
  }

  async logWarn(message: string) {
    await this.sendToAdmins(`⚠️ *Warning:* ${this.escapeMarkdown(message)}`);
  }

  async logError(message: string) {
    await this.sendToAdmins(`❌ *Error:* ${this.escapeMarkdown(message)}`);
  }

  private async sendToAdmins(message: string) {
    for (const chatId of this.adminChatIds) {
      try {
        await this.bot.telegram.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
        });
      } catch (err) {}
    }
  }

  /**
   * Экранируем символы Markdown, чтобы не было ошибок Telegram
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }
}
