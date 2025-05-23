import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // разрешаем соединения с любого домена (можно настроить точнее)
  },
})
export class StreamSocketsGateway {
  @WebSocketServer()
  server: Server;

  /**
   * Отправить ошибку потока
   */
  emitStreamError(payload: {
    id: string;
    name: string;
    message: string;
    timestamp: string;
  }) {
    this.server.emit('stream_error', payload);
  }

  /**
   * Отправить обновлённый статус потока
   */
  emitStreamStatus(payload: {
    id: string;
    name: string;
    status: 'starting' | 'running' | 'error' | 'stopped' | 'restarting';
    timestamp: string;
  }) {
    this.server.emit('stream_status', payload);
  }

  /**
   * (по желанию) Отправить лог или сообщение от потока
   */
  emitStreamLog(payload: {
    id: string;
    name: string;
    line: string;
    timestamp: string;
  }) {
    this.server.emit('stream_log', payload);
  }

  /**
   * (по желанию) Уведомление о старте нового потока
   */
  emitStreamStarted(payload: {
    id: string;
    name: string;
    rtmpUrl: string;
    rtspUrl: string;
    timestamp: string;
  }) {
    this.server.emit('stream_started', payload);
  }
}
