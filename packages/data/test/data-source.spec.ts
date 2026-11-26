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

  it('uses the supplied CA certificate when production SSL verification is enabled', () => {
    const ca = '-----BEGIN CERTIFICATE-----\npublic-test-ca\n-----END CERTIFICATE-----';
    const options = createDataSourceOptions({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://db/alertasc',
      DATABASE_SSL: 'true',
      DATABASE_SSL_CA_BASE64: Buffer.from(ca, 'utf8').toString('base64'),
    } as NodeJS.ProcessEnv);

    expect(options.ssl).toEqual({ ca, rejectUnauthorized: true });
  });

  it('rejects an invalid supplied CA certificate instead of silently weakening SSL', () => {
    expect(() => createDataSourceOptions({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://db/alertasc',
      DATABASE_SSL: 'true',
      DATABASE_SSL_CA_BASE64: Buffer.from('not a PEM certificate', 'utf8').toString('base64'),
    } as NodeJS.ProcessEnv)).toThrow('DATABASE_SSL_CA_BASE64 must contain a PEM certificate');
  });
});
