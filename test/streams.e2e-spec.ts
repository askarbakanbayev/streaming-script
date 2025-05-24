import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('StreamsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // Full app, not just controller
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/streams/notify (POST)', () => {
    return request(app.getHttpServer())
      .post('/streams/notify')
      .send({
        name: 'stream',
        rtmpUrl: 'rtmp://rtsp-server:1935/stream',
      })
      .expect(201);
  });

  it('/streams (GET)', () => {
    return request(app.getHttpServer()).get('/streams').expect(200);
  });

  it('/streams/:id (DELETE)', () => {
    return request(app.getHttpServer()).delete('/streams/test-id').expect(200);
  });

  it('/streams/:id/play (GET)', () => {
    return request(app.getHttpServer())
      .get('/streams/test-id/play')
      .expect((res) => {
        expect(res.status).toBe(200);
        expect(res.body.rtspUrl).toBeDefined();
        expect(res.body.vlc).toContain('vlc');
      });
  });

  it('/streams/:id/metadata (GET)', () => {
    return request(app.getHttpServer())
      .get('/streams/test-id/metadata')
      .expect(200);
  });

  it('/streams/:id/logs (GET)', () => {
    return request(app.getHttpServer())
      .get('/streams/test-id/logs')
      .expect(200);
  });

  it('/streams/:id/logs/download (GET)', () => {
    return request(app.getHttpServer())
      .get('/streams/test-id/logs/download')
      .expect(200);
  });

  it('/streams/:id/snapshot (GET)', () => {
    return request(app.getHttpServer())
      .get('/streams/test-id/snapshot')
      .expect(200)
      .expect('Content-Type', /image\/jpeg/);
  });

  it('/streams/send-error (POST)', () => {
    return request(app.getHttpServer())
      .post('/streams/send-error')
      .send({ message: 'Simulated error from test' })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });
});
