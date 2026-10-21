import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '@alertasc/data';
import { createApiApplication } from '../src/bootstrap.js';
import { AppModule } from '../src/app.module.js';
import { resetSyntheticTestDatabase, seedSyntheticFixtures } from '../src/testing/fixtures.js';

function resolveTestDatabaseUrl(): string {
  if (process.env.DATABASE_TEST_URL) return process.env.DATABASE_TEST_URL;
  if (process.env.DATABASE_URL) {
    const configured = new URL(process.env.DATABASE_URL);
    configured.pathname = '/alertasc_test';
    return configured.toString();
  }
  const user = encodeURIComponent(process.env.POSTGRES_USER ?? 'alertasc');
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD ?? '');
  const port = process.env.POSTGRES_PORT ?? '54329';
  return `postgresql://${user}:${password}@127.0.0.1:${port}/alertasc_test`;
}

describe('AlertaSC API with PostgreSQL', () => {
  let app: Awaited<ReturnType<typeof createApiApplication>>;
  let database: DataSource;
  let fixtures: Awaited<ReturnType<typeof seedSyntheticFixtures>>;

  beforeAll(async () => {
    const testUrl = resolveTestDatabaseUrl();
    if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) {
      throw new Error('DATABASE_TEST_URL must end in _test; the integration suite refuses other databases');
    }

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = testUrl;
    process.env.PERSONAL_DATA_MODE = 'synthetic';
    process.env.JWT_ACCESS_SECRET = 'test-only-access-secret-not-for-production-000000000000';
    process.env.JWT_REFRESH_SECRET = 'test-only-refresh-secret-not-for-production-000000000000';
    process.env.FIELD_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef';
    process.env.LOOKUP_HMAC_KEY = 'test-only-lookup-secret-not-for-production-000000000000';

    database = new DataSource(createDataSourceOptions(process.env));
    await database.initialize();
    await database.runMigrations();
    app = await createApiApplication(AppModule);
    await app.init();
  });

  beforeEach(async () => {
    await resetSyntheticTestDatabase(database);
    fixtures = await seedSyntheticFixtures(database);
  });

  afterAll(async () => {
    await app?.close();
    if (database?.isInitialized) await database.destroy();
  });

  async function login(account = fixtures.admin) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ cpf: account.cpf, password: account.password });
    expect(response.status).toBe(201);
    return { accessToken: response.body.accessToken as string, cookie: response.headers['set-cookie'] as string[] };
  }

  it('starts the API and verifies database readiness', async () => {
    expect((await request(app.getHttpServer()).get('/health')).status).toBe(200);
    expect((await request(app.getHttpServer()).get('/ready')).body.database).toBe('ready');
  });

  it('authenticates synthetic operators and never reveals credentials on failure', async () => {
    const valid = await login();
    expect(valid.accessToken).toEqual(expect.any(String));
    expect(valid.cookie.join(';')).toContain('HttpOnly');

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ cpf: fixtures.admin.cpf, password: 'incorrect-synthetic-password' });
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Credenciais inválidas.');
    expect(JSON.stringify(response.body)).not.toContain(fixtures.admin.cpf);

    const stored = await database.query(
      'SELECT oa.password_hash FROM operator_accounts oa WHERE oa.id = $1',
      [fixtures.admin.id],
    );
    expect(stored[0].password_hash).not.toBe(fixtures.admin.password);
  });

  it('rotates refresh tokens and revokes the session on logout', async () => {
    const session = await login();
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', session.cookie)
      .expect(201);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.headers['set-cookie']).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', session.cookie)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshed.headers['set-cookie'])
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshed.headers['set-cookie'])
      .expect(401);
  });

  it('enforces authorization on the API and grants the alert tab to only one operator', async () => {
    const [admin, secondOperator] = await Promise.all([login(fixtures.admin), login(fixtures.operator)]);
    await request(app.getHttpServer()).get('/api/v1/alerts').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/alerts')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(403);

    const acquisitions = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/alert-tab/acquire')
        .set('Authorization', `Bearer ${admin.accessToken}`),
      request(app.getHttpServer()).post('/api/v1/alert-tab/acquire')
        .set('Authorization', `Bearer ${secondOperator.accessToken}`),
    ]);
    expect(acquisitions.map(({ status }) => status).sort()).toEqual([201, 409]);

    const winnerIndex = acquisitions.findIndex(({ status }) => status === 201);
    const winningToken = winnerIndex === 0 ? admin.accessToken : secondOperator.accessToken;
    const losingToken = winnerIndex === 0 ? secondOperator.accessToken : admin.accessToken;
    await request(app.getHttpServer()).get('/api/v1/alerts')
      .set('Authorization', `Bearer ${winningToken}`).expect(200);
    await request(app.getHttpServer()).get('/api/v1/alerts')
      .set('Authorization', `Bearer ${losingToken}`).expect(403);
  });

  it('releases the global alert lock on logout and supports audited manual recovery', async () => {
    const operator = await login(fixtures.operator);
    await request(app.getHttpServer()).post('/api/v1/alert-tab/acquire')
      .set('Authorization', `Bearer ${operator.accessToken}`).expect(201);

    await request(app.getHttpServer()).post('/api/v1/auth/logout')
      .set('Cookie', operator.cookie).expect(204);
    const afterLogout = await request(app.getHttpServer()).post('/api/v1/alert-tab/acquire')
      .set('Authorization', `Bearer ${operator.accessToken}`);
    expect(afterLogout.status).toBe(401);
    const released = await database.query("SELECT count(*)::int AS count FROM audit_events WHERE action = 'ALERT_TAB_RELEASED'");
    expect(released[0].count).toBeGreaterThanOrEqual(1);

    const [admin, nextOperator] = await Promise.all([login(fixtures.admin), login(fixtures.operator)]);
    await request(app.getHttpServer()).post('/api/v1/alert-tab/acquire')
      .set('Authorization', `Bearer ${nextOperator.accessToken}`).expect(201);
    await request(app.getHttpServer()).post('/api/v1/alert-tab/recover')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'Sessão sintética órfã após encerramento detectado.' }).expect(201);
    await request(app.getHttpServer()).post('/api/v1/alert-tab/acquire')
      .set('Authorization', `Bearer ${admin.accessToken}`).expect(201);
    const recovery = await database.query("SELECT reason FROM audit_events WHERE action = 'ALERT_TAB_MANUAL_RECOVERY'");
    expect(recovery[0].reason).toContain('Sessão sintética');
  });

  it('does not let an operator without user-management permission provision accounts', async () => {
    const operator = await login(fixtures.operator);
    await request(app.getHttpServer()).post('/api/v1/admin/operators/fixtures')
      .set('Authorization', `Bearer ${operator.accessToken}`)
      .send({ fixtureKey: 'operator-pg-01' })
      .expect(403);
  });

  it('records alert transitions and expiration without deleting audit history', async () => {
    const session = await login();
    await request(app.getHttpServer()).post('/api/v1/alert-tab/acquire')
      .set('Authorization', `Bearer ${session.accessToken}`).expect(201);

    const claims = await Promise.all([
      request(app.getHttpServer()).post(`/api/v1/alerts/${fixtures.alertId}/claim`)
        .set('Authorization', `Bearer ${session.accessToken}`),
      request(app.getHttpServer()).post(`/api/v1/alerts/${fixtures.alertId}/claim`)
        .set('Authorization', `Bearer ${session.accessToken}`),
    ]);
    expect(claims.map(({ status }) => status).sort()).toEqual([201, 409]);
    await request(app.getHttpServer()).post(`/api/v1/alerts/${fixtures.alertId}/transition`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ status: 'APPROVED', reason: 'Revisão sintética para teste.' })
      .expect(201);

    await database.query(
      "UPDATE alerts SET generated_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' WHERE id = $1",
      [fixtures.alertId],
    );
    await request(app.getHttpServer()).get(`/api/v1/alerts/${fixtures.alertId}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('EXPIRED'));

    const history = await database.query('SELECT action FROM audit_events WHERE entity_id = $1 ORDER BY occurred_at', [fixtures.alertId]);
    expect(history.map((event: { action: string }) => event.action)).toEqual(expect.arrayContaining([
      'ALERT_CLAIMED', 'ALERT_STATUS_CHANGED',
    ]));
    const remaining = await database.query('SELECT count(*)::int AS count FROM audit_events WHERE entity_id = $1', [fixtures.alertId]);
    expect(remaining[0].count).toBeGreaterThanOrEqual(2);
  });

  it('supports only synthetic citizen fixtures and removes active contact/preferences on opt-out', async () => {
    const session = await login();
    await request(app.getHttpServer()).post('/api/v1/citizens')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ fixtureKey: 'resident-pg-01' })
      .expect(404);
    const created = await request(app.getHttpServer())
      .post('/api/v1/admin/citizens/fixtures')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ fixtureKey: 'resident-pg-01' })
      .expect(201);
    expect(created.body.synthetic).toBe(true);
    const personId = created.body.id as string;
    const preferences = await database.query('SELECT active, consented_at, channels FROM resident_preferences WHERE person_id = $1', [personId]);
    expect(preferences[0].active).toBe(true);
    expect(preferences[0].consented_at).toBeTruthy();
    expect(preferences[0].channels).toContain('telegram');

    const list = await request(app.getHttpServer()).get('/api/v1/admin/citizens')
      .set('Authorization', `Bearer ${session.accessToken}`).expect(200);
    expect(JSON.stringify(list.body)).not.toMatch(/phone|postal|latitude|longitude|cpf/i);

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/citizens/${personId}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(204);

    const remaining = await database.query('SELECT count(*)::int AS count FROM people WHERE id = $1', [personId]);
    const reconciliation = await database.query('SELECT count(*)::int AS count FROM deletion_reconciliation');
    expect(remaining[0].count).toBe(0);
    expect(reconciliation[0].count).toBeGreaterThan(0);
    const marker = await database.query('SELECT expires_at <= created_at + interval \'30 days\' AS within_policy FROM deletion_reconciliation');
    expect(marker[0].within_policy).toBe(true);
  });

  it('lets a synthetic citizen change preferences and remove their own registration', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/citizens/fixtures')
      .send({ fixtureKey: 'resident-pg-01' })
      .expect(201);
    const token = created.body.accessToken as string;
    const personId = created.body.id as string;
    expect(created.body.synthetic).toBe(true);
    await request(app.getHttpServer()).get('/api/v1/citizens/me').expect(401);

    const storedToken = await database.query(
      'SELECT access_token_hash FROM resident_preferences WHERE person_id = $1', [personId],
    );
    expect(storedToken[0].access_token_hash).toHaveLength(64);
    expect(storedToken[0].access_token_hash).not.toBe(token);

    const profile = await request(app.getHttpServer()).get('/api/v1/citizens/me')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(profile.body.active).toBe(true);
    expect(profile.body.consent).toBe(true);
    expect(JSON.stringify(profile.body)).not.toMatch(/phone|address|latitude|longitude|cpf/i);

    await request(app.getHttpServer()).patch('/api/v1/citizens/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ municipalityCodes: ['4205407'], eventTypes: ['chuva_intensa'], channels: ['telegram'] })
      .expect(400);

    await request(app.getHttpServer()).patch('/api/v1/citizens/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ municipalityCodes: ['4214001'], eventTypes: ['chuva_intensa'], channels: ['telegram'] })
      .expect(200);
    const preferences = await database.query(
      'SELECT event_types FROM resident_preferences WHERE person_id = $1', [personId],
    );
    expect(preferences[0].event_types).toEqual(['chuva_intensa']);

    await request(app.getHttpServer()).delete('/api/v1/citizens/me')
      .set('Authorization', `Bearer ${token}`).expect(204);
    await request(app.getHttpServer()).get('/api/v1/citizens/me')
      .set('Authorization', `Bearer ${token}`).expect(401);
    const person = await database.query('SELECT count(*)::int AS count FROM people WHERE id = $1', [personId]);
    expect(person[0].count).toBe(0);
  });

  it('disables synthetic citizen fixtures in production mode', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await request(app.getHttpServer()).post('/api/v1/citizens/fixtures')
        .send({ fixtureKey: 'resident-pg-01' }).expect(403);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
