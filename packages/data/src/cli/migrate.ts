import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../data-source.js';

config({ path: resolve(process.cwd(), '../../.env') });
const dataSource = new DataSource(createDataSourceOptions(process.env));
try {
  await dataSource.initialize();
  await dataSource.runMigrations();
  process.stdout.write('Database migrations completed.\n');
} catch (error) {
  const code = (error as { driverError?: { code?: string } })?.driverError?.code ?? 'UNKNOWN';
  process.stderr.write(`${JSON.stringify({ event: 'database_migration_failed', code })}\n`);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) await dataSource.destroy();
}
