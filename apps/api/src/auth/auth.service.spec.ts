import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { DataSource } from 'typeorm';
import type { AuditService } from '../audit/audit.service.js';
import { AuthService } from './auth.service.js';

function createService(settings: Record<string, string | undefined>) {
  const config = { get: (key: string) => settings[key] } as ConfigService;
  return new AuthService({} as DataSource, {} as JwtService, config, {} as AuditService);
}

const productionSecrets = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'access-secret-for-test-only-long-enough-000000000000',
  JWT_REFRESH_SECRET: 'refresh-secret-for-test-only-long-enough-000000000000',
  FIELD_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  LOOKUP_HMAC_KEY: 'lookup-secret-for-test-only-long-enough-000000000000',
};

describe('AuthService production configuration', () => {
  it('allows the public deployment to run in synthetic-only mode', () => {
    expect(() => createService({ ...productionSecrets, PERSONAL_DATA_MODE: 'synthetic' }).onModuleInit())
      .not.toThrow();
  });

  it('still allows production with institutionally approved personal-data mode', () => {
    expect(() => createService({ ...productionSecrets, PERSONAL_DATA_MODE: 'approved' }).onModuleInit())
      .not.toThrow();
  });

  it('rejects production when the personal-data mode is missing or unrecognized', () => {
    expect(() => createService(productionSecrets).onModuleInit()).toThrow(/personal-data mode/i);
    expect(() => createService({ ...productionSecrets, PERSONAL_DATA_MODE: 'anything-else' }).onModuleInit())
      .toThrow(/personal-data mode/i);
  });
});
