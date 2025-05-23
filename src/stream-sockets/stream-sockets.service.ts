import { Injectable } from '@nestjs/common';
import { StreamSocketsGateway } from './stream-sockets.gateway';

@Injectable()
export class StreamSocketsService {
  constructor(private readonly gateway: StreamSocketsGateway) {}

  emitStreamError(data: {
    id: string;
    name: string;
    message: string;
    timestamp: string;
  }) {
    this.gateway.emitStreamError(data);
  }

  emitStreamStatus(data: {
    id: string;
    name: string;
    status: 'starting' | 'running' | 'error' | 'stopped' | 'restarting';
    timestamp: string;
  }) {
    this.gateway.server.emit('stream_status', data);
  }

  emitGpsPosition(data: {
    streamId: string;
    lat: number;
    lng: number;
    altitude: number;
    speed: number;
    timestamp: string;
  }) {
    this.gateway.server.emit('drone_position', data);
  }
}
