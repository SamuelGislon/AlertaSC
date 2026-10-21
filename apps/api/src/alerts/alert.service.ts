import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isAllowedAlertTransition, effectiveAlertStatus, type AlertStatus, hasPermission } from '@alertasc/domain';
import { expireDueAlerts, returnedRows } from '@alertasc/data';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { AlertTabService } from '../alert-tab/alert-tab.service.js';
import { safeReviewReason } from '../security/reason.js';
import type { RequestPrincipal } from '../security/request-principal.js';

interface AlertRow {
  id: string;
  title: string;
  summary: string;
  source_label: string;
  area_label: string;
  status: AlertStatus;
  generated_at: Date;
  expires_at: Date;
}

@Injectable()
export class AlertService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(AlertTabService) private readonly alertTab: AlertTabService,
  ) {}

  async list(principal: RequestPrincipal): Promise<Array<Record<string, unknown>>> {
    await this.alertTab.assertAccess(principal.sessionId);
    await expireDueAlerts(this.database);
    const rows = await this.database.query(
      `SELECT id, title, summary, source_label, area_label, status, generated_at, expires_at
         FROM alerts WHERE synthetic = true ORDER BY generated_at DESC`,
    ) as AlertRow[];
    return rows.map((row) => this.toResponse(row));
  }

  async get(principal: RequestPrincipal, alertId: string): Promise<Record<string, unknown>> {
    await this.alertTab.assertAccess(principal.sessionId);
    await expireDueAlerts(this.database);
    const row = await this.findAlert(this.database, alertId);
    return this.toResponse(row);
  }

  async auditFor(principal: RequestPrincipal, alertId: string): Promise<Array<Record<string, unknown>>> {
    await this.alertTab.assertAccess(principal.sessionId);
    await this.findAlert(this.database, alertId);
    const events = await this.database.query(
      `SELECT id, actor_id AS "actorId", action, occurred_at AS "occurredAt", previous_state AS "previousState",
              new_state AS "newState", reason
         FROM audit_events
        WHERE entity_type = 'alert' AND entity_id = $1
        ORDER BY occurred_at ASC, id ASC`,
      [alertId],
    );
    return events;
  }

  async claim(principal: RequestPrincipal, alertId: string): Promise<{ claimed: true }> {
    await this.alertTab.assertAccess(principal.sessionId);
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = await runner.query('SELECT * FROM alerts WHERE id = $1 AND synthetic = true FOR UPDATE', [alertId]) as AlertRow[];
      const alert = rows[0];
      if (!alert) throw new NotFoundException('alert_not_found');
      if (new Date(alert.expires_at).getTime() <= Date.now() || alert.status === 'EXPIRED') {
        await this.expireInsideTransaction(runner, alert);
        await runner.commitTransaction();
        throw new ConflictException('alert_expired');
      }
      if (alert.status !== 'AWAITING_TRIAGE' && alert.status !== 'IN_ANALYSIS') {
        throw new ConflictException('alert_not_available');
      }
      const existing = await runner.query(
        'SELECT operator_id FROM alert_claims WHERE alert_id = $1 AND released_at IS NULL FOR UPDATE',
        [alertId],
      );
      if (existing.length) throw new ConflictException('alert_already_claimed');

      await runner.query(
        'INSERT INTO alert_claims (id, alert_id, operator_id, claimed_at) VALUES ($1, $2, $3, now())',
        [randomUUID(), alertId, principal.operatorId],
      );
      if (alert.status === 'AWAITING_TRIAGE') {
        await runner.query("UPDATE alerts SET status = 'IN_ANALYSIS', updated_at = now() WHERE id = $1", [alertId]);
      }
      await this.audit.record({
        actorId: principal.operatorId,
        action: 'ALERT_CLAIMED',
        entityType: 'alert',
        entityId: alertId,
        previousState: alert.status,
        newState: alert.status === 'AWAITING_TRIAGE' ? 'IN_ANALYSIS' : 'IN_ANALYSIS',
      }, runner);
      await runner.commitTransaction();
      return { claimed: true };
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async transition(
    principal: RequestPrincipal,
    alertId: string,
    targetValue: unknown,
    reasonValue: unknown,
  ): Promise<{ status: AlertStatus }> {
    const target = targetValue as AlertStatus;
    if (target !== 'APPROVED' && target !== 'REJECTED') throw new ConflictException('invalid_alert_transition');
    const neededPermission = target === 'APPROVED' ? 'ALERT_APPROVE' : 'ALERT_REJECT';
    if (!hasPermission(principal.roles, neededPermission)) throw new ForbiddenException('permission_denied');
    await this.alertTab.assertAccess(principal.sessionId);
    const reason = safeReviewReason(reasonValue);

    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = await runner.query('SELECT * FROM alerts WHERE id = $1 AND synthetic = true FOR UPDATE', [alertId]) as AlertRow[];
      const alert = rows[0];
      if (!alert) throw new NotFoundException('alert_not_found');
      if (new Date(alert.expires_at).getTime() <= Date.now() || alert.status === 'EXPIRED') {
        await this.expireInsideTransaction(runner, alert);
        await runner.commitTransaction();
        throw new ConflictException('alert_expired');
      }
      if (!isAllowedAlertTransition(alert.status, target)) throw new ConflictException('invalid_alert_transition');
      const claims = await runner.query(
        `SELECT operator_id FROM alert_claims
          WHERE alert_id = $1 AND operator_id = $2 AND released_at IS NULL FOR UPDATE`,
        [alertId, principal.operatorId],
      );
      if (!claims.length) throw new ConflictException('alert_claim_required');

      await runner.query('UPDATE alerts SET status = $2, updated_at = now() WHERE id = $1', [alertId, target]);
      await runner.query('UPDATE alert_claims SET released_at = now() WHERE alert_id = $1 AND released_at IS NULL', [alertId]);
      await this.audit.record({
        actorId: principal.operatorId,
        action: 'ALERT_STATUS_CHANGED',
        entityType: 'alert',
        entityId: alertId,
        previousState: alert.status,
        newState: target,
        reason,
        metadata: { transition: `${alert.status}:${target}` },
      }, runner);
      await runner.commitTransaction();
      return { status: target };
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async expireInsideTransaction(runner: ReturnType<DataSource['createQueryRunner']>, alert: AlertRow): Promise<void> {
    const updated = returnedRows<{ id: string }>(await runner.query(
      "UPDATE alerts SET status = 'EXPIRED', updated_at = now() WHERE id = $1 AND status <> 'EXPIRED' RETURNING id",
      [alert.id],
    ));
    if (updated.length) {
      await this.audit.record({
        actorId: null,
        action: 'ALERT_EXPIRED',
        entityType: 'alert',
        entityId: alert.id,
        previousState: alert.status,
        newState: 'EXPIRED',
      }, runner);
    }
  }

  private async findAlert(manager: Pick<DataSource, 'query'>, alertId: string): Promise<AlertRow> {
    const rows = await manager.query(
      `SELECT id, title, summary, source_label, area_label, status, generated_at, expires_at
         FROM alerts WHERE id = $1 AND synthetic = true`,
      [alertId],
    ) as AlertRow[];
    if (!rows[0]) throw new NotFoundException('alert_not_found');
    return rows[0];
  }

  private toResponse(alert: AlertRow): Record<string, unknown> {
    return {
      id: alert.id,
      title: alert.title,
      summary: alert.summary,
      source: alert.source_label,
      area: alert.area_label,
      status: effectiveAlertStatus({
        id: alert.id,
        status: alert.status,
        generatedAt: new Date(alert.generated_at),
        expiresAt: new Date(alert.expires_at),
      }, new Date()),
      generatedAt: alert.generated_at,
      expiresAt: alert.expires_at,
      synthetic: true,
    };
  }
}
