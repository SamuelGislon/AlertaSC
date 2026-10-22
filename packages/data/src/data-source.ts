import type { DataSourceOptions } from 'typeorm';
import { InitialSchema1792540800000 } from './migrations/InitialSchema202610210001.js';
import { AddSyntheticCitizenAccess1792540800001 } from './migrations/AddSyntheticCitizenAccess1792540800001.js';
import { AddSyntheticAlertEvidence1792540800002 } from './migrations/AddSyntheticAlertEvidence1792540800002.js';

export function createDataSourceOptions(env: NodeJS.ProcessEnv): DataSourceOptions {
  const url = env.NODE_ENV === 'production'
    ? env.DATABASE_URL?.trim()
    : env.NODE_ENV === 'test'
      ? (env.DATABASE_TEST_URL?.trim() || env.DATABASE_URL?.trim() || defaultLocalDatabaseUrl(env))
      : (env.DATABASE_URL?.trim() || defaultLocalDatabaseUrl(env));
  if (!url) throw new Error('DATABASE_URL must be configured');

  return {
    type: 'postgres',
    url,
    entities: [],
    migrations: [InitialSchema1792540800000, AddSyntheticCitizenAccess1792540800001, AddSyntheticAlertEvidence1792540800002],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    ssl: env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false,
    extra: {
      application_name: 'alertasc',
      statement_timeout: 10_000,
      idle_in_transaction_session_timeout: 10_000,
    },
  };
}

function defaultLocalDatabaseUrl(env: NodeJS.ProcessEnv): string | undefined {
  const password = env.POSTGRES_PASSWORD;
  if (!password) return undefined;
  const user = encodeURIComponent(env.POSTGRES_USER || 'alertasc');
  const safePassword = encodeURIComponent(password);
  const port = env.POSTGRES_PORT || '54329';
  const name = env.NODE_ENV === 'test' ? 'alertasc_test' : 'alertasc_dev';
  return `postgresql://${user}:${safePassword}@127.0.0.1:${port}/${name}`;
}
