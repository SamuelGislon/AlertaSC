import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../src/data-source.js';
import { expireDueAlerts, purgeExpiredDeletionMarkers } from '../src/lifecycle.js';

describe('PostgreSQL/PostGIS schema', () => {
  let database: DataSource;

  beforeAll(async () => {
    const url = process.env.DATABASE_TEST_URL;
    if (!url || !new URL(url).pathname.endsWith('_test')) {
      throw new Error('DATABASE_TEST_URL must point to a database whose name ends with _test');
    }
    database = new DataSource(createDataSourceOptions({
      ...process.env,
      DATABASE_URL: url,
      NODE_ENV: 'test',
    }));
    await database.initialize();
    await database.runMigrations();
  });

  afterAll(async () => {
    if (database?.isInitialized) await database.destroy();
  });

  it('installs PostGIS and creates the stage-two schema with explicit migrations', async () => {
    const extension = await database.query("SELECT extname FROM pg_extension WHERE extname = 'postgis'");
    const tables = await database.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    expect(extension).toHaveLength(1);
    expect(tables.map((row: { tablename: string }) => row.tablename)).toEqual(expect.arrayContaining([
      'people', 'operator_accounts', 'resident_preferences', 'alerts', 'alert_claims',
      'alert_tab_lease', 'audit_events', 'refresh_sessions', 'deletion_reconciliation',
    ]));
  });

  it('rejects updates and deletes of audit events at the database boundary', async () => {
    const eventId = randomUUID();
    await database.query(
      `INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, occurred_at)
       VALUES ($1, NULL, 'TEST_SCHEMA_GUARD', 'test', $1, now())`,
      [eventId],
    );
    await expect(database.query('UPDATE audit_events SET action = $2 WHERE id = $1', [eventId, 'ALTERED']))
      .rejects.toThrow(/append-only/i);
    await expect(database.query('DELETE FROM audit_events WHERE id = $1', [eventId]))
      .rejects.toThrow(/append-only/i);
  });

  it('expires due alerts once and preserves the expiration event in history', async () => {
    const alertId = randomUUID();
    const generatedAt = new Date('2026-10-20T12:00:00.000Z');
    const expiresAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1_000);
    await database.query(
      `INSERT INTO alerts (id, title, summary, source_label, area_label, status, generated_at, expires_at, synthetic, municipality_code, event_type)
       VALUES ($1, 'Chuva sintética', 'Evento fictício', 'fixture', 'Presidente Getúlio', 'AWAITING_TRIAGE', $2, $3, true, '4214001', 'chuva_intensa')`,
      [alertId, generatedAt, expiresAt],
    );

    expect(await expireDueAlerts(database, new Date(expiresAt.getTime() - 1))).toBe(0);
    expect(await expireDueAlerts(database, expiresAt)).toBe(1);
    expect(await expireDueAlerts(database, expiresAt)).toBe(0);

    const row = await database.query('SELECT status FROM alerts WHERE id = $1', [alertId]);
    const events = await database.query('SELECT action, previous_state, new_state FROM audit_events WHERE entity_id = $1', [alertId]);
    expect(row[0].status).toBe('EXPIRED');
    expect(events).toContainEqual(expect.objectContaining({
      action: 'ALERT_EXPIRED', previous_state: 'AWAITING_TRIAGE', new_state: 'EXPIRED',
    }));
  });

  it('purges only expired deletion-reconciliation markers using a controllable clock', async () => {
    const now = new Date('2026-11-01T00:00:00.000Z');
    const expiredId = randomUUID();
    const retainedId = randomUUID();
    await database.query('TRUNCATE TABLE deletion_reconciliation');
    await database.query(
      `INSERT INTO deletion_reconciliation (id, subject_hmac, created_at, expires_at)
       VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
      [expiredId, 'a'.repeat(64), new Date('2026-10-01T00:00:00.000Z'), new Date('2026-10-30T23:59:59.999Z'),
        retainedId, 'b'.repeat(64), new Date('2026-10-20T00:00:00.000Z'), new Date('2026-11-19T00:00:00.000Z')],
    );

    expect(await purgeExpiredDeletionMarkers(database, now)).toBe(1);
    const rows = await database.query('SELECT id FROM deletion_reconciliation');
    expect(rows).toEqual([{ id: retainedId }]);
  });
});
