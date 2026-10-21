import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, type QueryRunner } from 'typeorm';

export interface AuditRecord {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: string | null;
  newState?: string | null;
  reason?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export const NON_SENSITIVE_METADATA_KEYS = new Set(['synthetic', 'transition', 'session_action', 'count']);

@Injectable()
export class AuditService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  async record(record: AuditRecord, queryRunner?: QueryRunner): Promise<string> {
    const metadata = Object.fromEntries(
      Object.entries(record.metadata ?? {}).filter(([key]) => NON_SENSITIVE_METADATA_KEYS.has(key)),
    );
    const eventId = randomUUID();
    const executor = queryRunner?.manager ?? this.database.manager;
    await executor.query(
      `INSERT INTO audit_events
        (id, actor_id, action, entity_type, entity_id, occurred_at, previous_state, new_state, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, now(), $6, $7, $8, $9::jsonb)`,
      [eventId, record.actorId, record.action, record.entityType, record.entityId,
        record.previousState ?? null, record.newState ?? null, record.reason ?? null, JSON.stringify(metadata)],
    );
    return eventId;
  }
}
