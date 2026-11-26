import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { afterEach, describe, expect, it } from 'vitest';
import { SyntheticDataGuard } from './synthetic-data.guard.js';

const originalNodeEnv = process.env.NODE_ENV;
const originalMode = process.env.PERSONAL_DATA_MODE;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalMode === undefined) delete process.env.PERSONAL_DATA_MODE;
  else process.env.PERSONAL_DATA_MODE = originalMode;
});

describe('SyntheticDataGuard', () => {
  it('allows the explicitly synthetic fixture flows in production synthetic-only mode', () => {
    process.env.NODE_ENV = 'production';
    process.env.PERSONAL_DATA_MODE = 'synthetic';

    expect(new SyntheticDataGuard().canActivate({} as ExecutionContext)).toBe(true);
  });

  it('blocks fixture flows in production when synthetic-only mode is not active', () => {
    process.env.NODE_ENV = 'production';
    process.env.PERSONAL_DATA_MODE = 'approved';

    expect(() => new SyntheticDataGuard().canActivate({} as ExecutionContext)).toThrow(ForbiddenException);
  });

  it('blocks fixture flows in non-production when synthetic-only mode is not active', () => {
    process.env.NODE_ENV = 'development';
    process.env.PERSONAL_DATA_MODE = 'approved';

    expect(() => new SyntheticDataGuard().canActivate({} as ExecutionContext)).toThrow(ForbiddenException);
  });
});
