import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { returnedRows } from './query.js';

export async function expireDueAlerts(database: DataSource, now = new Date(), batchSize = 100): Promise<number> {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1_000) {
    throw new Error('batchSize must be between 1 and 1000');
  }
  const runner = database.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const due = await runner.query(
      `SELECT id, status FROM alerts
        WHERE status <> 'EXPIRED' AND expires_at <= $1
        ORDER BY expires_at, id
        LIMIT $2 FOR UPDATE SKIP LOCKED`,
      [now, batchSize],
    ) as Array<{ id: string; status: string }>;
    for (const alert of due) {
      const updated = returnedRows<{ id: string }>(await runner.query(
        "UPDATE alerts SET status = 'EXPIRED', updated_at = $2 WHERE id = $1 AND status <> 'EXPIRED' RETURNING id",
        [alert.id, now],
      ));
      if (!updated.length) continue;
      await runner.query(
        `INSERT INTO audit_events
          (id, actor_id, action, entity_type, entity_id, occurred_at, previous_state, new_state, metadata)
         VALUES ($1, NULL, 'ALERT_EXPIRED', 'alert', $2, $3, $4, 'EXPIRED', '{}'::jsonb)`,
        [randomUUID(), alert.id, now, alert.status],
      );
    }
    await runner.commitTransaction();
    return due.length;
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
}

export async function purgeExpiredDeletionMarkers(database: DataSource, now = new Date()): Promise<number> {
  const rows = returnedRows<{ id: string }>(await database.query(
    'DELETE FROM deletion_reconciliation WHERE expires_at <= $1 RETURNING id',
    [now],
  ));
  return rows.length;
}
