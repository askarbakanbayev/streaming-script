import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { StreamsController } from './streaming.controller';
import { StreamsService } from './streaming.service';
import { BotService } from 'src/bot/bot.service';

describe('StreamsController (e2e)', () => {
  let app: INestApplication;
  let streamsService = {
    startStream: jest.fn(),
    getStreams: jest.fn(),
    stopStream: jest.fn(),
    getLog: jest.fn(),
    getMetadata: jest.fn(),
  };
  let botService = {
    broadcastError: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StreamsController],
      providers: [
        { provide: StreamsService, useValue: streamsService },
        { provide: BotService, useValue: botService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/streams/notify (POST) should start a stream', () => {
    streamsService.startStream.mockReturnValue({ success: true });

    return request(app.getHttpServer())
      .post('/streams/notify')
      .send({
        name: 'DroneCam 1',
        rtmpUrl: 'rtmp://rtsp-server:1935/stream',
      })
      .expect(201)
      .expect({ success: true });
  });

  it('/streams (GET) should return list of streams', () => {
    streamsService.getStreams.mockReturnValue([
      { id: 'abc', name: 'Stream 1' },
    ]);

    return request(app.getHttpServer())
      .get('/streams')
      .expect(200)
      .expect([{ id: 'abc', name: 'Stream 1' }]);
  });

  it('/streams/:id (DELETE) should remove a stream', () => {
    streamsService.stopStream.mockReturnValue(true);

    return request(app.getHttpServer())
      .delete('/streams/test-id')
      .expect(200)
      .expect({ success: true });
  });

  it('/streams/send-error (POST) should send error to Telegram', async () => {
    botService.broadcastError.mockResolvedValue({ status: 'ok' });

    return request(app.getHttpServer())
      .post('/streams/send-error')
      .send({ message: 'Camera disconnected' })
      .expect(201);
  });

  it('/streams/:id/play (GET) should return stream commands', () => {
    streamsService.getMetadata.mockReturnValue({
      rtspUrl: 'rtsp://localhost:8554/test',
    });

    return request(app.getHttpServer())
      .get('/streams/test-id/play')
      .expect(200)
      .expect((res) => {
        expect(res.body.rtspUrl).toBe('rtsp://localhost:8554/test');
        expect(res.body.vlc).toContain('vlc');
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
