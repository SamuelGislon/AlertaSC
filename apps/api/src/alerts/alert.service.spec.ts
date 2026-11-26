import { ConflictException } from '@nestjs/common';
import type { DataSource, QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../audit/audit.service.js';
import type { RequestPrincipal } from '../security/request-principal.js';
import type { AlertTabService } from '../alert-tab/alert-tab.service.js';
import { AlertService } from './alert.service.js';

const principal: RequestPrincipal = {
  operatorId: 'operator-current',
  sessionId: 'session-current',
  roles: ['ADMIN'],
};

function setupClaim(existingOperatorId: string) {
  const runner = {
    isTransactionActive: true,
    connect: vi.fn().mockResolvedValue(undefined),
    startTransaction: vi.fn().mockResolvedValue(undefined),
    commitTransaction: vi.fn().mockResolvedValue(undefined),
    rollbackTransaction: vi.fn().mockResolvedValue(undefined),
    release: vi.fn().mockResolvedValue(undefined),
    query: vi.fn()
      .mockResolvedValueOnce([{
        id: 'alert-in-analysis',
        status: 'IN_ANALYSIS',
        expires_at: new Date(Date.now() + 60_000),
      }])
      .mockResolvedValueOnce([{ operator_id: existingOperatorId }]),
  };
  const database = { createQueryRunner: vi.fn(() => runner) } as unknown as DataSource;
  const audit = { record: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const alertTab = { assertAccess: vi.fn().mockResolvedValue(undefined) } as unknown as AlertTabService;
  return { service: new AlertService(database, audit, alertTab), runner, audit };
}

describe('AlertService.claim', () => {
  it('resumes an existing claim owned by the same operator without creating a duplicate', async () => {
    const { service, runner, audit } = setupClaim(principal.operatorId);

    await expect(service.claim(principal, 'alert-in-analysis')).resolves.toEqual({ claimed: true });

    expect(runner.query).toHaveBeenCalledTimes(2);
    expect(runner.commitTransaction).toHaveBeenCalledOnce();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('does not let the current operator take over another operator claim', async () => {
    const { service, runner } = setupClaim('operator-other');
    let error: unknown;
    try {
      await service.claim(principal, 'alert-in-analysis');
    } catch (cause) {
      error = cause;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({ message: 'alert_already_claimed' });
    expect(runner.rollbackTransaction).toHaveBeenCalledOnce();
  });
});
