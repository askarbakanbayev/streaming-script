#!/usr/bin/env node
import open from 'open';
import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { StreamsService } from './src/streaming/streaming.service';
import { BotService } from './src/bot/bot.service';
import { CreateStreamDto } from './src/streaming/dto/create-streaming.dto';

const program = new Command();

program.name('stream-cli').description('Stream control CLI').version('1.0.0');

let streamsService: StreamsService;
let botService: BotService;

async function setupApp() {
  const app = await NestFactory.createApplicationContext(AppModule);
  streamsService = app.get(StreamsService);
  botService = app.get(BotService);
}

program
  .command('start')
  .description('Start a new stream')
  .requiredOption('-n, --name <name>', 'Stream name')
  .requiredOption('-r, --rtmpUrl <url>', 'RTMP input URL')
  .action(async (opts) => {
    await setupApp();
    const dto: CreateStreamDto = {
      name: opts.name,
      rtmpUrl: opts.rtmpUrl,
    };
    const result = await streamsService.startStream(dto);
    console.log('✅ Stream started:', result);
  });

program
  .command('stop')
  .description('Stop a stream')
  .argument('<id>', 'Stream ID')
  .action(async (id) => {
    await setupApp();
    const success = await streamsService.stopStream(id);
    if (success) console.log(`🛑 Stream "${id}" stopped.`);
    else console.error(`❌ Stream "${id}" not found.`);
  });

program
  .command('list')
  .description('List all active streams')
  .action(async () => {
    await setupApp();
    const streams = await streamsService.getStreams();
    console.table(streams);
  });

program
  .command('metadata')
  .description('Get stream metadata')
  .argument('<id>', 'Stream ID')
  .action(async (id) => {
    await setupApp();
    const meta = await streamsService.getMetadata(id);
    if (meta) console.log(meta);
    else console.error('❌ Stream not found.');
  });

program
  .command('error')
  .description('Send an error message to Telegram')
  .argument('<message>', 'Error message')
  .action(async (message) => {
    await setupApp();
    await botService.broadcastError(message);
    console.log('📨 Error sent to Telegram.');
  });

program
  .command('webrtc')
  .description('Open WebRTC page for a stream')
  .argument('<id>', 'Stream ID')
  .action((id) => {
    const url = `http://localhost:6001/streams/${id}/webrtc`;
    console.log('🌐 Opening:', url);
    open(url);
  });

program.parseAsync(process.argv);
