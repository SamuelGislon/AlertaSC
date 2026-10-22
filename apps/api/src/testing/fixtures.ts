import { randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { makeSyntheticIdentity, formatCpf } from '../admin/synthetic.js';

export interface SyntheticAccountFixture {
  id: string;
  cpf: string;
  password: string;
}

export async function resetSyntheticTestDatabase(database: DataSource): Promise<void> {
  const url = new URL(process.env.DATABASE_TEST_URL || process.env.DATABASE_URL || '');
  if (!url.pathname.endsWith('_test')) throw new Error('Refusing to reset a database that does not end in _test');
  await database.query(
    `TRUNCATE TABLE alert_tab_lease, audit_events, deletion_reconciliation, refresh_sessions,
      alert_observations,
      alert_claims, alerts, resident_preferences, operator_accounts, people RESTART IDENTITY CASCADE`,
  );
}

export async function seedSyntheticFixtures(database: DataSource): Promise<{
  admin: SyntheticAccountFixture;
  operator: SyntheticAccountFixture;
  alertId: string;
}> {
  const admin = await createSyntheticAccount(database, ['ADMIN']);
  const operator = await createSyntheticAccount(database, ['OPERATOR']);
  const alertId = randomUUID();
  const generatedAt = new Date(Date.now() - 60 * 60 * 1_000);
  const expiresAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1_000);
  await database.query(
    `INSERT INTO alerts
      (id, title, summary, source_label, area_label, status, generated_at, expires_at, created_by, synthetic,
       municipality_code, event_type)
     VALUES ($1, 'Chuva intensa — dado sintético', 'Alerta fictício para desenvolvimento local.',
       'Fixture local — estação fictícia PG-01', 'Presidente Getúlio/SC — região fictícia',
       'AWAITING_TRIAGE', $2, $3, $4, true, '4214001', 'chuva_intensa')`,
    [alertId, generatedAt, expiresAt, admin.id],
  );
  await recordSyntheticAlertLineage(database, alertId, generatedAt);
  return { admin, operator, alertId };
}

export async function createSyntheticAccount(database: DataSource, roles: string[]): Promise<SyntheticAccountFixture> {
  const identity = makeSyntheticIdentity(true);
  const operatorId = randomUUID();
  const password = randomBytes(20).toString('base64url');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await database.query(
    `INSERT INTO people
      (id, full_name, cpf_lookup_hash, phone_lookup_hash, phone_ciphertext, postal_code, city,
       neighborhood, street, house_number, complement, location_consent, synthetic)
     VALUES ($1, $2, $3, $4, $5, '89150-000', 'Presidente Getúlio', 'Bairro sintético',
       'Rua sintética', '1', NULL, false, true)`,
    [identity.personId, identity.fullName, identity.cpfLookupHash, identity.phoneLookupHash, identity.phoneCiphertext],
  );
  await database.query(
    'INSERT INTO operator_accounts (id, person_id, password_hash, roles) VALUES ($1, $2, $3, $4)',
    [operatorId, identity.personId, passwordHash, roles],
  );
  await database.query(
    `INSERT INTO resident_preferences (id, person_id, active, municipality_codes, event_types, channels)
     VALUES ($1, $2, false, '{}', '{}', '{}')`,
    [randomUUID(), identity.personId],
  );
  return { id: operatorId, cpf: formatCpf(identity.cpf), password };
}

export async function createFirstSyntheticAdministrator(database: DataSource): Promise<SyntheticAccountFixture | null> {
  const existing = await database.query("SELECT id FROM operator_accounts WHERE roles @> ARRAY['ADMIN']::text[] AND active = true LIMIT 1");
  if (existing.length) return null;
  return createSyntheticAccount(database, ['ADMIN']);
}

export async function ensureSyntheticReviewAlert(database: DataSource): Promise<boolean> {
  const legacyFixtures = await database.query(
    `SELECT a.id, a.generated_at
       FROM alerts a
      WHERE a.synthetic = true AND a.source_label LIKE 'Fixture local%'
        AND NOT EXISTS (SELECT 1 FROM alert_observations ao WHERE ao.alert_id = a.id)`,
  );
  for (const alert of legacyFixtures) {
    await database.transaction(async (manager) => {
      await recordSyntheticAlertEvidence(manager, alert.id, new Date(alert.generated_at));
    });
  }

  const existing = await database.query(
    `SELECT id, generated_at FROM alerts
      WHERE synthetic = true AND status IN ('AWAITING_TRIAGE', 'IN_ANALYSIS') AND expires_at > now()
      LIMIT 1`,
  );
  if (existing.length) {
    const observations = await database.query(
      'SELECT id FROM alert_observations WHERE alert_id = $1 LIMIT 1', [existing[0].id],
    );
    if (!observations.length) {
      await database.transaction(async (manager) => {
        await recordSyntheticAlertEvidence(manager, existing[0].id, new Date(existing[0].generated_at));
      });
    }
    return false;
  }
  const operators = await database.query(
    `SELECT oa.id FROM operator_accounts oa JOIN people p ON p.id = oa.person_id
      WHERE oa.active = true AND oa.roles @> ARRAY['ADMIN']::text[] AND p.synthetic = true LIMIT 1`,
  );
  if (!operators[0]) return false;

  const alertId = randomUUID();
  const generatedAt = new Date(Date.now() - 30 * 60 * 1_000);
  const expiresAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1_000);
  await database.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO alerts
        (id, title, summary, source_label, area_label, status, generated_at, expires_at, created_by, synthetic,
         municipality_code, event_type)
       VALUES ($1, 'Exemplo sintético — chuva intensa',
         'Situação fictícia para validar a base executável. Não representa risco observado.',
         'Fixture local — estação fictícia PG-01', 'Presidente Getúlio/SC — área fictícia',
         'AWAITING_TRIAGE', $2, $3, $4, true, '4214001', 'chuva_intensa')`,
      [alertId, generatedAt, expiresAt, operators[0].id],
    );
    await recordSyntheticAlertLineage(manager, alertId, generatedAt);
  });
  return true;
}

async function recordSyntheticAlertLineage(executor: Pick<DataSource, 'query'>, alertId: string, observedAt: Date) {
  await recordSyntheticAlertEvidence(executor, alertId, observedAt);
  await executor.query(
    `INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, occurred_at, new_state, metadata)
     VALUES ($1, NULL, 'SYNTHETIC_ALERT_GENERATED', 'alert', $2, $3, 'AWAITING_TRIAGE', '{"synthetic":true,"stage":"candidate"}'::jsonb)`,
    [randomUUID(), alertId, new Date(observedAt.getTime() + 2)],
  );
}

async function recordSyntheticAlertEvidence(executor: Pick<DataSource, 'query'>, alertId: string, observedAt: Date) {
  await executor.query(
    `INSERT INTO alert_observations
      (id, alert_id, source_label, metric_label, raw_value, raw_unit, normalized_value, normalized_unit,
       observed_at, area_label, synthetic)
     VALUES ($1, $2, 'Fixture local — estação fictícia PG-01', 'Precipitação acumulada em 1 hora',
       5.2, 'cm', 52, 'mm', $3, 'Presidente Getúlio/SC — área fictícia', true)`,
    [randomUUID(), alertId, observedAt],
  );
  const events = [
    {
      action: 'SYNTHETIC_SOURCE_DATA_RECEIVED', state: null,
      occurredAt: observedAt,
      metadata: { synthetic: true, stage: 'raw', source: 'Fixture local — estação fictícia PG-01', metric: 'Precipitação acumulada em 1 hora', value: 5.2, unit: 'cm' },
    },
    {
      action: 'SYNTHETIC_DATA_NORMALIZED', state: null,
      occurredAt: new Date(observedAt.getTime() + 1),
      metadata: { synthetic: true, stage: 'normalized', source: 'Normalizador sintético', metric: 'Precipitação acumulada em 1 hora', value: 52, unit: 'mm' },
    },
  ];
  for (const event of events) {
    await executor.query(
      `INSERT INTO audit_events (id, actor_id, action, entity_type, entity_id, occurred_at, new_state, metadata)
       VALUES ($1, NULL, $2, 'alert', $3, $4, $5, $6::jsonb)`,
      [randomUUID(), event.action, alertId, event.occurredAt, event.state, JSON.stringify(event.metadata)],
    );
  }
}
