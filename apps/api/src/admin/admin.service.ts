import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';
import { lookupDigest, returnedRows } from '@alertasc/data';
import { AuditService } from '../audit/audit.service.js';
import { AlertTabService } from '../alert-tab/alert-tab.service.js';
import { formatCpf, makeSyntheticIdentity } from './synthetic.js';
import type { RequestPrincipal } from '../security/request-principal.js';

const VALID_OPERATOR_FIXTURES = new Set(['operator-pg-01', 'operator-pg-02']);
const VALID_CITIZEN_FIXTURES = new Set(['resident-pg-01', 'resident-pg-02']);
const MUNICIPALITY_PRESIDENTE_GETULIO = '4214001';
const VALID_CITIZEN_EVENT_TYPES = new Set(['chuva_intensa', 'inundacao']);
const VALID_CITIZEN_CHANNELS = new Set(['telegram']);

@Injectable()
export class AdminService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(AlertTabService) private readonly alertTab: AlertTabService,
  ) {}

  async createOperatorFixture(actor: RequestPrincipal, fixtureKey: unknown) {
    if (typeof fixtureKey !== 'string' || !VALID_OPERATOR_FIXTURES.has(fixtureKey)) {
      throw new NotFoundException('synthetic_operator_fixture_not_found');
    }
    const identity = makeSyntheticIdentity(true);
    const operatorId = randomUUID();
    const password = randomBytes(24).toString('base64url');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await this.insertPerson(runner, identity);
      await runner.query(
        `INSERT INTO operator_accounts (id, person_id, password_hash, roles)
         VALUES ($1, $2, $3, ARRAY['OPERATOR']::text[])`,
        [operatorId, identity.personId, passwordHash],
      );
      await this.insertOperatorCitizenRecord(runner, identity.personId);
      await this.audit.record({
        actorId: actor.operatorId,
        action: 'SYNTHETIC_OPERATOR_PROVISIONED',
        entityType: 'operator_account',
        entityId: operatorId,
        metadata: { synthetic: true, role: 'OPERATOR' },
      }, runner);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    return { id: operatorId, synthetic: true, oneTimeCredentials: { cpf: formatCpf(identity.cpf), password } };
  }

  async listSyntheticOperators() {
    const rows = await this.database.query(
      `SELECT oa.id, oa.roles, oa.active, p.synthetic
         FROM operator_accounts oa
         JOIN people p ON p.id = oa.person_id
        WHERE p.synthetic = true
        ORDER BY oa.id`,
    );
    return rows.map((row: { id: string; roles: string[]; active: boolean; synthetic: boolean }) => ({
      id: row.id, roles: row.roles, active: row.active, synthetic: row.synthetic,
    }));
  }

  async resetOperatorPassword(actor: RequestPrincipal, operatorId: string, passwordValue: unknown) {
    const password = typeof passwordValue === 'string' ? passwordValue : '';
    if (!password || password.length > 128) throw new ConflictException('invalid_password');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const updated = returnedRows<{ id: string }>(await runner.query(
        `UPDATE operator_accounts oa SET password_hash = $2
           FROM people p
          WHERE oa.id = $1 AND oa.person_id = p.id AND p.synthetic = true AND oa.active = true
          RETURNING oa.id`,
        [operatorId, passwordHash],
      ));
      if (!updated.length) throw new NotFoundException('operator_not_found');
      await runner.query('UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE operator_id = $1', [operatorId]);
      await this.audit.record({
        actorId: actor.operatorId,
        action: 'OPERATOR_PASSWORD_RESET',
        entityType: 'operator_account',
        entityId: operatorId,
      }, runner);
      await runner.commitTransaction();
      return { reset: true };
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async disableOperator(actor: RequestPrincipal, operatorId: string) {
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      // Serialize account disable operations so concurrent requests cannot remove
      // the last active administrator at the same time.
      await runner.query('SELECT pg_advisory_xact_lock(4214001001)');
      const target = returnedRows<{ id: string; roles: string[] }>(await runner.query(
        `SELECT oa.id, oa.roles
           FROM operator_accounts oa
           JOIN people p ON p.id = oa.person_id
          WHERE oa.id = $1 AND p.synthetic = true AND oa.active = true
          FOR UPDATE OF oa`,
        [operatorId],
      ))[0];
      if (!target) throw new NotFoundException('operator_not_found');
      if (actor.operatorId === operatorId) throw new ConflictException('cannot_disable_self');
      if (target.roles.includes('ADMIN')) {
        const otherAdmins = returnedRows<{ id: string }>(await runner.query(
          `SELECT id FROM operator_accounts
            WHERE active = true AND roles @> ARRAY['ADMIN']::text[] AND id <> $1
            LIMIT 1`,
          [operatorId],
        ));
        if (!otherAdmins.length) throw new ConflictException('cannot_disable_last_admin');
      }
      await runner.query(
        'UPDATE operator_accounts SET active = false, disabled_at = now() WHERE id = $1',
        [operatorId],
      );
      await runner.query('UPDATE refresh_sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE operator_id = $1', [operatorId]);
      const leases = returnedRows<{ singleton_id: number }>(await runner.query(
        'DELETE FROM alert_tab_lease WHERE operator_id = $1 RETURNING singleton_id',
        [operatorId],
      ));
      const claims = returnedRows<{ alert_id: string }>(await runner.query(
        'UPDATE alert_claims SET released_at = now() WHERE operator_id = $1 AND released_at IS NULL RETURNING alert_id',
        [operatorId],
      ));
      for (const claim of claims) {
        await this.audit.record({
          actorId: actor.operatorId,
          action: 'ALERT_CLAIM_RELEASED',
          entityType: 'alert',
          entityId: claim.alert_id,
          metadata: { session_action: 'released' },
        }, runner);
      }
      if (leases.length) {
        await this.audit.record({
          actorId: actor.operatorId,
          action: 'ALERT_TAB_RELEASED',
          entityType: 'alert_tab',
          entityId: randomUUID(),
          metadata: { session_action: 'operator_disabled' },
        }, runner);
      }
      await this.audit.record({
        actorId: actor.operatorId,
        action: 'OPERATOR_DISABLED',
        entityType: 'operator_account',
        entityId: operatorId,
      }, runner);
      await runner.commitTransaction();
      return { disabled: true };
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async createCitizenFixture(actor: RequestPrincipal, fixtureKey: unknown) {
    if (typeof fixtureKey !== 'string' || !VALID_CITIZEN_FIXTURES.has(fixtureKey)) {
      throw new NotFoundException('synthetic_citizen_fixture_not_found');
    }
    const identity = makeSyntheticIdentity(false);
    const residentPreferenceId = randomUUID();
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await this.insertPerson(runner, identity);
      await runner.query(
        `INSERT INTO resident_preferences
          (id, person_id, consented_at, consent_source, consent_version, municipality_codes, event_types, channels, active)
         VALUES ($1, $2, now(), 'synthetic_fixture', 'synthetic-only-v1', $3, $4, $5, true)`,
        [residentPreferenceId, identity.personId, [MUNICIPALITY_PRESIDENTE_GETULIO], ['chuva_intensa', 'inundacao'], ['telegram']],
      );
      await this.audit.record({
        actorId: actor.operatorId,
        action: 'SYNTHETIC_CITIZEN_CREATED',
        entityType: 'citizen_registration',
        entityId: randomUUID(),
        metadata: { synthetic: true },
      }, runner);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    return { id: identity.personId, active: true, synthetic: true };
  }

  async createSelfServiceCitizenFixture(fixtureKey: unknown) {
    if (typeof fixtureKey !== 'string' || !VALID_CITIZEN_FIXTURES.has(fixtureKey)) {
      throw new NotFoundException('synthetic_citizen_fixture_not_found');
    }
    const identity = makeSyntheticIdentity(false);
    const residentPreferenceId = randomUUID();
    const accessToken = randomBytes(32).toString('base64url');
    const accessTokenHash = lookupDigest(accessToken, this.requiredSecret('LOOKUP_HMAC_KEY'));
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await this.insertPerson(runner, identity);
      await runner.query(
        `INSERT INTO resident_preferences
          (id, person_id, consented_at, consent_source, consent_version, municipality_codes, event_types, channels, active, access_token_hash)
         VALUES ($1, $2, now(), 'synthetic_fixture', 'synthetic-only-v1', $3, $4, $5, true, $6)`,
        [residentPreferenceId, identity.personId, [MUNICIPALITY_PRESIDENTE_GETULIO], ['chuva_intensa', 'inundacao'], ['telegram'], accessTokenHash],
      );
      await this.audit.record({
        actorId: null,
        action: 'SYNTHETIC_CITIZEN_CREATED',
        entityType: 'citizen_registration',
        entityId: randomUUID(),
        metadata: { synthetic: true },
      }, runner);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    return { id: identity.personId, synthetic: true, accessToken };
  }

  async getCitizenPreferences(personId: string) {
    const rows = await this.database.query(
      `SELECT p.id, p.synthetic, rp.active, rp.consented_at, rp.municipality_codes, rp.event_types, rp.channels
         FROM people p JOIN resident_preferences rp ON rp.person_id = p.id
        WHERE p.id = $1 AND p.synthetic = true AND rp.active = true`,
      [personId],
    );
    const preference = rows[0] as {
      id: string; synthetic: boolean; active: boolean; consented_at: Date;
      municipality_codes: string[]; event_types: string[]; channels: string[];
    } | undefined;
    if (!preference) throw new NotFoundException('synthetic_citizen_not_found');
    return {
      id: preference.id,
      synthetic: preference.synthetic,
      active: preference.active,
      consent: true,
      consentedAt: preference.consented_at,
      municipalities: preference.municipality_codes,
      eventTypes: preference.event_types,
      channels: preference.channels,
    };
  }

  async updateCitizenPreferences(personId: string, value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('invalid_preferences');
    }
    const input = value as Record<string, unknown>;
    const allowedKeys = new Set(['municipalityCodes', 'eventTypes', 'channels']);
    if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
      throw new BadRequestException('invalid_preferences');
    }
    const municipalityCodes = this.validateChoices(input.municipalityCodes, new Set([MUNICIPALITY_PRESIDENTE_GETULIO]));
    const eventTypes = this.validateChoices(input.eventTypes, VALID_CITIZEN_EVENT_TYPES);
    const channels = this.validateChoices(input.channels, VALID_CITIZEN_CHANNELS);
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const updated = returnedRows<{ id: string }>(await runner.query(
        `UPDATE resident_preferences rp SET municipality_codes = $2, event_types = $3, channels = $4, updated_at = now()
           FROM people p
          WHERE rp.person_id = $1 AND p.id = rp.person_id AND p.synthetic = true
            AND rp.active = true
          RETURNING rp.id`,
        [personId, municipalityCodes, eventTypes, channels],
      ));
      if (!updated.length) throw new NotFoundException('synthetic_citizen_not_found');
      await this.audit.record({
        actorId: null,
        action: 'CITIZEN_PREFERENCES_UPDATED',
        entityType: 'citizen_registration',
        entityId: randomUUID(),
        metadata: { synthetic: true },
      }, runner);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    return this.getCitizenPreferences(personId);
  }

  async removeSelfServiceCitizen(personId: string): Promise<void> {
    await this.removeCitizen(personId, null);
  }

  async listCitizenFixtures() {
    const rows = await this.database.query(
      `SELECT p.id, p.synthetic, rp.active, rp.consented_at, rp.municipality_codes, rp.event_types, rp.channels
         FROM people p JOIN resident_preferences rp ON rp.person_id = p.id
        WHERE p.synthetic = true ORDER BY p.created_at DESC`,
    );
    return rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      synthetic: row.synthetic,
      active: row.active,
      consentedAt: row.consented_at,
      municipalities: row.municipality_codes,
      eventTypes: row.event_types,
      channels: row.channels,
    }));
  }

  async removeCitizenFixture(actor: RequestPrincipal, personId: string): Promise<void> {
    await this.removeCitizen(personId, actor.operatorId);
  }

  private async removeCitizen(personId: string, actorId: string | null): Promise<void> {
    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = await runner.query(
        `SELECT p.id, p.synthetic, oa.id AS operator_id
           FROM people p LEFT JOIN operator_accounts oa ON oa.person_id = p.id
          WHERE p.id = $1 FOR UPDATE OF p`,
        [personId],
      );
      const person = rows[0] as { id: string; synthetic: boolean; operator_id: string | null } | undefined;
      if (!person || !person.synthetic) throw new NotFoundException('synthetic_citizen_not_found');

      await runner.query('DELETE FROM resident_preferences WHERE person_id = $1', [personId]);
      const subjectHmac = lookupDigest(personId, this.requiredSecret('LOOKUP_HMAC_KEY'));
      await runner.query(
        `INSERT INTO deletion_reconciliation (id, subject_hmac, created_at, expires_at)
         VALUES ($1, $2, now(), now() + interval '30 days')
         ON CONFLICT (subject_hmac) DO UPDATE SET created_at = now(), expires_at = now() + interval '30 days'`,
        [randomUUID(), subjectHmac],
      );
      if (!person.operator_id) {
        await runner.query('DELETE FROM people WHERE id = $1', [personId]);
      }
      await this.audit.record({
        actorId,
        action: 'CITIZEN_OPTED_OUT',
        entityType: 'citizen_registration',
        entityId: randomUUID(),
        metadata: { synthetic: true },
      }, runner);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private validateChoices(value: unknown, allowed: Set<string>): string[] {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !allowed.has(item))) {
      throw new BadRequestException('invalid_preferences');
    }
    return [...new Set(value as string[])];
  }

  async auditEventsForEntity(entityId: string) {
    return this.database.query(
      `SELECT id, actor_id AS "actorId", action, entity_type AS "entityType", entity_id AS "entityId",
              occurred_at AS "occurredAt", previous_state AS "previousState", new_state AS "newState",
              reason, metadata
         FROM audit_events WHERE entity_id = $1 ORDER BY occurred_at ASC`,
      [entityId],
    );
  }

  private async insertPerson(runner: ReturnType<DataSource['createQueryRunner']>, identity: ReturnType<typeof makeSyntheticIdentity>) {
    await runner.query(
      `INSERT INTO people
        (id, full_name, cpf_lookup_hash, phone_lookup_hash, phone_ciphertext, postal_code, city,
         neighborhood, street, house_number, complement, latitude, longitude, location_consent, synthetic)
       VALUES ($1, $2, $3, $4, $5, '89150-000', 'Presidente Getúlio', 'Bairro sintético',
               'Rua sintética', '1', NULL, NULL, NULL, false, true)`,
      [identity.personId, identity.fullName, identity.cpfLookupHash, identity.phoneLookupHash, identity.phoneCiphertext],
    );
  }

  private async insertOperatorCitizenRecord(runner: ReturnType<DataSource['createQueryRunner']>, personId: string) {
    await runner.query(
      `INSERT INTO resident_preferences
        (id, person_id, consented_at, consent_source, consent_version, municipality_codes, event_types, channels, active)
       VALUES ($1, $2, NULL, NULL, NULL, '{}', '{}', '{}', false)`,
      [randomUUID(), personId],
    );
  }

  private requiredSecret(key: string): string {
    const value = this.config.get<string>(key) ?? process.env[key];
    if (!value) throw new Error(`Required runtime setting is missing: ${key}`);
    return value;
  }
}
