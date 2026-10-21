import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792540800000 implements MigrationInterface {
  name = 'InitialSchema1792540800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const statements = [
      'CREATE EXTENSION IF NOT EXISTS postgis',
      `CREATE TABLE people (
        id uuid PRIMARY KEY,
        full_name text NOT NULL,
        cpf_lookup_hash char(64) UNIQUE,
        phone_lookup_hash char(64) NOT NULL UNIQUE,
        phone_ciphertext text NOT NULL,
        postal_code text NOT NULL,
        city text NOT NULL,
        neighborhood text NOT NULL,
        street text NOT NULL,
        house_number text NOT NULL,
        complement text,
        latitude double precision,
        longitude double precision,
        location_consent boolean NOT NULL DEFAULT false,
        synthetic boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT people_coordinates_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
        CONSTRAINT people_location_consent CHECK (location_consent = (latitude IS NOT NULL AND longitude IS NOT NULL))
      )`,
      `CREATE TABLE operator_accounts (
        id uuid PRIMARY KEY,
        person_id uuid NOT NULL UNIQUE REFERENCES people(id) ON DELETE RESTRICT,
        password_hash text NOT NULL,
        roles text[] NOT NULL CHECK (cardinality(roles) > 0 AND roles <@ ARRAY['ADMIN','OPERATOR']::text[]),
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        disabled_at timestamptz
      )`,
      `CREATE TABLE resident_preferences (
        id uuid PRIMARY KEY,
        person_id uuid NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
        consented_at timestamptz,
        consent_source text,
        consent_version text,
        municipality_codes text[] NOT NULL DEFAULT '{}',
        event_types text[] NOT NULL DEFAULT '{}',
        channels text[] NOT NULL DEFAULT '{}',
        active boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT resident_consent_consistent CHECK (
          (active = false) OR (consented_at IS NOT NULL AND consent_source IS NOT NULL AND consent_version IS NOT NULL)
        )
      )`,
      `CREATE TABLE alerts (
        id uuid PRIMARY KEY,
        title text NOT NULL,
        summary text NOT NULL,
        source_label text NOT NULL,
        area_label text NOT NULL,
        status text NOT NULL CHECK (status IN ('AWAITING_TRIAGE','IN_ANALYSIS','APPROVED','REJECTED','EXPIRED')),
        generated_at timestamptz NOT NULL,
        expires_at timestamptz NOT NULL,
        created_by uuid REFERENCES operator_accounts(id) ON DELETE RESTRICT,
        updated_at timestamptz NOT NULL DEFAULT now(),
        synthetic boolean NOT NULL DEFAULT true,
        CONSTRAINT alert_expiry_after_generation CHECK (expires_at = generated_at + interval '24 hours')
      )`,
      'CREATE INDEX alerts_queue_idx ON alerts (status, generated_at DESC)',
      'CREATE INDEX alerts_expiration_idx ON alerts (expires_at) WHERE status <> \'EXPIRED\'',
      `CREATE TABLE alert_claims (
        id uuid PRIMARY KEY,
        alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE RESTRICT,
        operator_id uuid NOT NULL REFERENCES operator_accounts(id) ON DELETE RESTRICT,
        claimed_at timestamptz NOT NULL DEFAULT now(),
        released_at timestamptz
      )`,
      "CREATE UNIQUE INDEX alert_claims_one_active_idx ON alert_claims (alert_id) WHERE released_at IS NULL",
      `CREATE TABLE alert_tab_lease (
        singleton_id smallint PRIMARY KEY DEFAULT 1 CHECK (singleton_id = 1),
        operator_id uuid NOT NULL REFERENCES operator_accounts(id) ON DELETE RESTRICT,
        session_id uuid NOT NULL UNIQUE,
        acquired_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE audit_events (
        id uuid PRIMARY KEY,
        actor_id uuid REFERENCES operator_accounts(id) ON DELETE RESTRICT,
        action text NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        previous_state text,
        new_state text,
        reason text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
      )`,
      'CREATE INDEX audit_events_entity_idx ON audit_events (entity_type, entity_id, occurred_at)',
      `CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'audit_events is append-only' USING ERRCODE = '55000'; END;
      $$`,
      `CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events
        FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation()`,
      `CREATE TABLE refresh_sessions (
        id uuid PRIMARY KEY,
        operator_id uuid NOT NULL REFERENCES operator_accounts(id) ON DELETE RESTRICT,
        token_hash char(64) NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        replaced_by uuid REFERENCES refresh_sessions(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      'CREATE INDEX refresh_sessions_active_idx ON refresh_sessions (operator_id, expires_at) WHERE revoked_at IS NULL',
      `CREATE TABLE deletion_reconciliation (
        id uuid PRIMARY KEY,
        subject_hmac char(64) NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        CONSTRAINT deletion_reconciliation_max_30_days CHECK (expires_at <= created_at + interval '30 days')
      )`,
      'CREATE INDEX deletion_reconciliation_expiry_idx ON deletion_reconciliation (expires_at)',
    ];
    for (const statement of statements) await queryRunner.query(statement);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'deletion_reconciliation', 'refresh_sessions', 'audit_events', 'alert_tab_lease',
      'alert_claims', 'alerts', 'resident_preferences', 'operator_accounts', 'people',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    await queryRunner.query('DROP FUNCTION IF EXISTS reject_audit_mutation()');
  }
}
