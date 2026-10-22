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
  municipality_code: string;
  event_type: string;
}

interface AlertObservationRow {
  alert_id: string;
  source_label: string;
  metric_label: string;
  raw_value: string | number;
  raw_unit: string;
  normalized_value: string | number;
  normalized_unit: string;
  observed_at: Date;
  area_label: string;
  synthetic: boolean;
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
      `SELECT id, title, summary, source_label, area_label, status, generated_at, expires_at,
              municipality_code, event_type
         FROM alerts WHERE synthetic = true ORDER BY generated_at DESC`,
    ) as AlertRow[];
    const observations = await this.observationsFor(rows.map((row) => row.id));
    return rows.map((row) => this.toResponse(row, observations.get(row.id) ?? []));
  }

  async get(principal: RequestPrincipal, alertId: string): Promise<Record<string, unknown>> {
    await this.alertTab.assertAccess(principal.sessionId);
    await expireDueAlerts(this.database);
    const row = await this.findAlert(this.database, alertId);
    const observations = await this.observationsFor([row.id]);
    return this.toResponse(row, observations.get(row.id) ?? []);
  }

  async auditFor(principal: RequestPrincipal, alertId: string): Promise<Array<Record<string, unknown>>> {
    await this.alertTab.assertAccess(principal.sessionId);
    await this.findAlert(this.database, alertId);
    const events = await this.database.query(
      `SELECT id, actor_id AS "actorId", action, occurred_at AS "occurredAt", previous_state AS "previousState",
              new_state AS "newState", reason, metadata
         FROM audit_events
        WHERE entity_type = 'alert' AND entity_id = $1
        ORDER BY occurred_at ASC, id ASC`,
      [alertId],
    );
    return events;
  }

  async simulateDelivery(principal: RequestPrincipal, alertId: string) {
    await this.alertTab.assertAccess(principal.sessionId);
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = await runner.query(
        'SELECT * FROM alerts WHERE id = $1 AND synthetic = true FOR UPDATE', [alertId],
      ) as AlertRow[];
      const alert = rows[0];
      if (!alert) throw new NotFoundException('alert_not_found');
      if (new Date(alert.expires_at).getTime() <= Date.now() || alert.status === 'EXPIRED') {
        await this.expireInsideTransaction(runner, alert);
        await runner.commitTransaction();
        throw new ConflictException('alert_expired');
      }
      if (alert.status !== 'APPROVED') throw new ConflictException('alert_not_available');

      // Lock eligible preference rows so opt-out and the simulated attempt have a clear
      // transaction order. Each subsequent attempt runs the query again.
      const eligible = await runner.query(
        `SELECT rp.id
           FROM resident_preferences rp
           JOIN people p ON p.id = rp.person_id
          WHERE p.synthetic = true AND rp.active = true AND rp.consented_at IS NOT NULL
            AND rp.municipality_codes @> ARRAY[$1]::text[]
            AND rp.event_types @> ARRAY[$2]::text[]
            AND rp.channels @> ARRAY['telegram']::text[]
          ORDER BY rp.id FOR UPDATE OF rp`,
        [alert.municipality_code, alert.event_type],
      ) as Array<{ id: string }>;
      const eligibleCount = eligible.length;
      await this.audit.record({
        actorId: principal.operatorId,
        action: 'SYNTHETIC_DELIVERY_SIMULATED',
        entityType: 'alert',
        entityId: alert.id,
        metadata: { synthetic: true, stage: 'delivery_simulated', channel: 'telegram', count: eligibleCount },
      }, runner);
      await runner.commitTransaction();
      return {
        synthetic: true,
        simulated: true,
        eligibleCount,
        message: `Simulação local concluída para ${eligibleCount} cidadão(s) sintético(s). Nenhuma mensagem foi enviada; nenhuma chamada externa foi feita.`,
      };
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
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
      `SELECT id, title, summary, source_label, area_label, status, generated_at, expires_at,
              municipality_code, event_type
         FROM alerts WHERE id = $1 AND synthetic = true`,
      [alertId],
    ) as AlertRow[];
    if (!rows[0]) throw new NotFoundException('alert_not_found');
    return rows[0];
  }

  private async observationsFor(alertIds: string[]): Promise<Map<string, AlertObservationRow[]>> {
    if (!alertIds.length) return new Map();
    const rows = await this.database.query(
      `SELECT alert_id, source_label, metric_label, raw_value, raw_unit,
              normalized_value, normalized_unit, observed_at, area_label, synthetic
         FROM alert_observations
        WHERE alert_id = ANY($1::uuid[])
        ORDER BY observed_at ASC, id ASC`,
      [alertIds],
    ) as AlertObservationRow[];
    const grouped = new Map<string, AlertObservationRow[]>();
    for (const row of rows) {
      const bucket = grouped.get(row.alert_id) ?? [];
      bucket.push(row);
      grouped.set(row.alert_id, bucket);
    }
    return grouped;
  }

  private toResponse(alert: AlertRow, observations: AlertObservationRow[] = []): Record<string, unknown> {
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
      relatedReadings: observations.map((row) => ({
        source: row.source_label,
        metric: row.metric_label,
        rawValue: Number(row.raw_value),
        rawUnit: row.raw_unit,
        normalizedValue: Number(row.normalized_value),
        normalizedUnit: row.normalized_unit,
        observedAt: row.observed_at,
        area: row.area_label,
        synthetic: row.synthetic,
      })),
    };
  }
}
