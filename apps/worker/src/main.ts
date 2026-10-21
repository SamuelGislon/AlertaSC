import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './app.module.js';

const worker = await NestFactory.createApplicationContext(WorkerModule, { logger: false });
process.stdout.write(JSON.stringify({ event: 'worker_started', schedules: ['every-minute-alert-expiration', 'daily-deletion-reconciliation-purge'] }) + '\n');
const shutdown = async () => { await worker.close(); process.exit(0); };
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
