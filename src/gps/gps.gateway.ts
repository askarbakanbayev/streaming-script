import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { GpsService } from './gps.service';
import { CreateGpDto } from './dto/create-gps.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class GpsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gpsService: GpsService) {}

  @SubscribeMessage('gps_telemetry')
  handleGpsUpdate(@MessageBody() dto: CreateGpDto) {
    this.gpsService.create(dto);

    this.server.emit('position', {
      ...dto,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('get_all_gps')
  getAll() {
    return this.gpsService.findAll();
  }

  @SubscribeMessage('get_gps')
  getOne(@MessageBody() streamId: string) {
    return this.gpsService.findOne(streamId);
  }

  @SubscribeMessage('remove_gps')
  remove(@MessageBody() streamId: string) {
    return this.gpsService.remove(streamId);
  }
}
