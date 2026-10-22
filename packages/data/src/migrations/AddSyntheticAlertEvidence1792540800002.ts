import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyntheticAlertEvidence1792540800002 implements MigrationInterface {
  name = 'AddSyntheticAlertEvidence1792540800002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE alerts ADD COLUMN municipality_code text');
    await queryRunner.query('ALTER TABLE alerts ADD COLUMN event_type text');
    await queryRunner.query(
      "UPDATE alerts SET municipality_code = '4214001', event_type = 'chuva_intensa' WHERE municipality_code IS NULL OR event_type IS NULL",
    );
    await queryRunner.query('ALTER TABLE alerts ALTER COLUMN municipality_code SET NOT NULL');
    await queryRunner.query('ALTER TABLE alerts ALTER COLUMN event_type SET NOT NULL');
    await queryRunner.query(`
      CREATE TABLE alert_observations (
        id uuid PRIMARY KEY,
        alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE RESTRICT,
        source_label text NOT NULL,
        metric_label text NOT NULL,
        raw_value numeric NOT NULL,
        raw_unit text NOT NULL,
        normalized_value numeric NOT NULL,
        normalized_unit text NOT NULL,
        observed_at timestamptz NOT NULL,
        area_label text NOT NULL,
        synthetic boolean NOT NULL DEFAULT true
      )
    `);
    await queryRunner.query('CREATE INDEX alert_observations_alert_time_idx ON alert_observations (alert_id, observed_at)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS alert_observations');
    await queryRunner.query('ALTER TABLE alerts DROP COLUMN IF EXISTS event_type');
    await queryRunner.query('ALTER TABLE alerts DROP COLUMN IF EXISTS municipality_code');
  }
}
