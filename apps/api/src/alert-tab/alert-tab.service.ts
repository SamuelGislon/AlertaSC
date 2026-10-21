import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { returnedRows } from '@alertasc/data';
import { AuditService } from '../audit/audit.service.js';
import { safeReviewReason } from '../security/reason.js';
import type { RequestPrincipal } from '../security/request-principal.js';

@Injectable()
export class AlertTabService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async acquire(principal: RequestPrincipal): Promise<{ acquired: true }> {
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const inserted = await runner.query(
        `INSERT INTO alert_tab_lease (singleton_id, operator_id, session_id, acquired_at)
         VALUES (1, $1, $2, now()) ON CONFLICT (singleton_id) DO NOTHING RETURNING singleton_id`,
        [principal.operatorId, principal.sessionId],
      );
      if (inserted.length) {
        await this.audit.record({
          actorId: principal.operatorId,
          action: 'ALERT_TAB_ACQUIRED',
          entityType: 'alert_tab',
          entityId: randomUUID(),
          metadata: { session_action: 'acquired' },
        }, runner);
        await runner.commitTransaction();
        return { acquired: true };
      }

      const existing = await runner.query('SELECT operator_id, session_id FROM alert_tab_lease WHERE singleton_id = 1 FOR UPDATE');
      if (existing[0]?.session_id === principal.sessionId && existing[0]?.operator_id === principal.operatorId) {
        await runner.commitTransaction();
        return { acquired: true };
      }
      throw new ConflictException('alert_tab_occupied');
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async release(principal: RequestPrincipal): Promise<boolean> {
    return this.releaseSession(principal.sessionId, principal.operatorId);
  }

  async releaseSession(sessionId: string, actorId: string | null = null): Promise<boolean> {
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = returnedRows<{ operator_id: string }>(await runner.query(
        'DELETE FROM alert_tab_lease WHERE singleton_id = 1 AND session_id = $1 RETURNING operator_id',
        [sessionId],
      ));
      const holder = rows[0];
      if (holder) {
        await this.releaseActiveClaims(runner, holder.operator_id);
        await this.audit.record({
          actorId: actorId ?? holder.operator_id,
          action: 'ALERT_TAB_RELEASED',
          entityType: 'alert_tab',
          entityId: randomUUID(),
          metadata: { session_action: 'released' },
        }, runner);
      }
      await runner.commitTransaction();
      return Boolean(holder);
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async recover(actor: RequestPrincipal, reasonValue: unknown): Promise<void> {
    const reason = safeReviewReason(reasonValue);
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = returnedRows<{ operator_id: string }>(await runner.query(
        'DELETE FROM alert_tab_lease WHERE singleton_id = 1 RETURNING operator_id',
      ));
      if (!rows.length) throw new NotFoundException('alert_tab_not_occupied');
      await this.releaseActiveClaims(runner, rows[0]!.operator_id);
      await this.audit.record({
        actorId: actor.operatorId,
        action: 'ALERT_TAB_MANUAL_RECOVERY',
        entityType: 'alert_tab',
        entityId: randomUUID(),
        reason,
        metadata: { session_action: 'manual_recovery' },
      }, runner);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async assertAccess(sessionId: string): Promise<void> {
    const rows = await this.database.query(
      'SELECT 1 FROM alert_tab_lease WHERE singleton_id = 1 AND session_id = $1',
      [sessionId],
    );
    if (!rows.length) throw new ForbiddenException('alert_tab_lock_required');
  }

  async isHeldBy(sessionId: string): Promise<boolean> {
    const rows = await this.database.query(
      'SELECT 1 FROM alert_tab_lease WHERE singleton_id = 1 AND session_id = $1',
      [sessionId],
    );
    return rows.length > 0;
  }

  private async releaseActiveClaims(runner: ReturnType<DataSource['createQueryRunner']>, operatorId: string): Promise<void> {
    const claims = returnedRows<{ alert_id: string }>(await runner.query(
      `UPDATE alert_claims SET released_at = now()
        WHERE operator_id = $1 AND released_at IS NULL RETURNING alert_id`,
      [operatorId],
    ));
    for (const claim of claims) {
      await this.audit.record({
        actorId: operatorId,
        action: 'ALERT_CLAIM_RELEASED',
        entityType: 'alert',
        entityId: claim.alert_id,
        metadata: { session_action: 'released' },
      }, runner);
    }
  }
}
