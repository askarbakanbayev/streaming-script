import { StreamSocketsService } from './stream-sockets.service';
import { StreamSocketsGateway } from './stream-sockets.gateway';

describe('StreamSocketsService', () => {
  let service: StreamSocketsService;
  let gateway: StreamSocketsGateway;

  beforeEach(() => {
    gateway = {
      emitStreamError: jest.fn(),
      server: {
        emit: jest.fn(),
      },
    } as any;

    service = new StreamSocketsService(gateway);
  });

  it('should call gateway.emitStreamError with correct data', () => {
    const errorData = {
      id: '1',
      name: 'DroneCam 1',
      message: 'Camera error',
      timestamp: new Date().toISOString(),
    };

    service.emitStreamError(errorData);

    expect(gateway.emitStreamError).toHaveBeenCalledWith(errorData);
  });

  it('should emit stream_status event with correct data', () => {
    const statusData: {
      id: string;
      name: string;
      status: 'running' | 'starting' | 'error' | 'stopped' | 'restarting';
      timestamp: string;
    } = {
      id: '2',
      name: 'DroneCam 2',
      status: 'running',
      timestamp: new Date().toISOString(),
    };

    service.emitStreamStatus(statusData);

    expect(gateway.server.emit).toHaveBeenCalledWith(
      'stream_status',
      statusData,
    );
  });

  it('should emit drone_position event with correct data', () => {
    const gpsData = {
      streamId: '3',
      lat: 40.7128,
      lng: -74.006,
      altitude: 100.5,
      speed: 15.3,
      timestamp: new Date().toISOString(),
    };

    service.emitGpsPosition(gpsData);

    expect(gateway.server.emit).toHaveBeenCalledWith('drone_position', gpsData);
  });
});
