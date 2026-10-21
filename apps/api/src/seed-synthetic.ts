import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '@alertasc/data';
import { createFirstSyntheticAdministrator, ensureSyntheticReviewAlert } from './testing/fixtures.js';

config({ path: resolve(process.cwd(), '../../.env') });
if (process.env.NODE_ENV === 'production' || process.env.PERSONAL_DATA_MODE !== 'synthetic') {
  process.stderr.write('Synthetic seed is available only in a non-production synthetic environment.\n');
  process.exit(1);
}
const database = new DataSource(createDataSourceOptions(process.env));
try {
  await database.initialize();
  await database.runMigrations();
  const credentials = await createFirstSyntheticAdministrator(database);
  const alertCreated = await ensureSyntheticReviewAlert(database);
  if (!credentials) {
    process.stdout.write('An active synthetic administrator already exists. No account was changed.\n');
  } else {
    process.stdout.write('Synthetic local administrator created. This one-time output is not stored in application logs.\n');
    process.stdout.write(`CPF sintético: ${credentials.cpf}\nSenha sintética: ${credentials.password}\n`);
  }
  if (alertCreated) process.stdout.write('A fictional review alert was added for the local dashboard.\n');
} catch {
  process.stderr.write('Synthetic seed failed; connection and credential details were omitted.\n');
  process.exitCode = 1;
} finally {
  if (database.isInitialized) await database.destroy();
}
