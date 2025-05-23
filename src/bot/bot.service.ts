import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;
  private readonly adminChatId: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('BOT_TOKEN');
    this.adminChatId = this.configService.get<string>('ADMIN_CHAT_ID') || '';
    if (!token || !this.adminChatId) {
      throw new Error(
        'BOT_TOKEN or ADMIN_CHAT_ID is not defined in environment variables',
      );
    }
    this.bot = new Telegraf(token);
  }

  onModuleInit() {
    this.setup();
  }

  private async setup() {
    this.bot.start((ctx) => {
      console.log('Ваш chat ID:', ctx.chat.id);
      ctx.reply(
        `👋 Привет, ${ctx.from.first_name || 'друг'}!

Ты подключился к системе логирования конвертера RTMP → RTSP.

📡 Здесь ты будешь видеть:
- Ошибки трансляции
- Технические сообщения
- Статусы входящих потоков

⚙️ Для демонстрации используем VLC или ffplay.

Оставайся на связи, логи скоро начнут поступать.`,
      );
    });

    await this.bot.launch();
  }

  async sendErrorLog(message: string) {
    try {
      await this.bot.telegram.sendMessage(
        this.adminChatId,
        `🚨 *Ошибка*: ${message}`,
        {
          parse_mode: 'Markdown',
        },
      );
    } catch (error) {
      console.error('Ошибка отправки сообщения в Telegram:', error);
    }
  }
}
