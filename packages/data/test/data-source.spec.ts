import { describe, expect, it } from 'vitest';
import { createDataSourceOptions } from '../src/data-source.js';

describe('database environment configuration', () => {
  it('uses the local development database only outside production', () => {
    const options = createDataSourceOptions({
      NODE_ENV: 'development', POSTGRES_USER: 'alertasc', POSTGRES_PASSWORD: 'local-only',
    } as NodeJS.ProcessEnv);
    expect(options.url).toBe('postgresql://alertasc:local-only@127.0.0.1:54329/alertasc_dev');
  });

  it('selects the test database in test mode', () => {
    const options = createDataSourceOptions({
      NODE_ENV: 'test', POSTGRES_USER: 'alertasc', POSTGRES_PASSWORD: 'local-only',
    } as NodeJS.ProcessEnv);
    expect(options.url).toBe('postgresql://alertasc:local-only@127.0.0.1:54329/alertasc_test');
  });

  it('requires an explicit database URL in production', () => {
    expect(() => createDataSourceOptions({
      NODE_ENV: 'production', POSTGRES_USER: 'alertasc', POSTGRES_PASSWORD: 'local-only',
    } as NodeJS.ProcessEnv)).toThrow('DATABASE_URL must be configured');
    const options = createDataSourceOptions({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://db/alertasc' } as NodeJS.ProcessEnv);
    expect(options.url).toBe('postgresql://db/alertasc');
  });
});
