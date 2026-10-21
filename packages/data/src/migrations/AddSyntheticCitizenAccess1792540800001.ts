import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyntheticCitizenAccess1792540800001 implements MigrationInterface {
  name = 'AddSyntheticCitizenAccess1792540800001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE resident_preferences ADD COLUMN access_token_hash char(64)');
    await queryRunner.query(
      'CREATE UNIQUE INDEX resident_preferences_access_token_hash_idx ON resident_preferences (access_token_hash) WHERE access_token_hash IS NOT NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS resident_preferences_access_token_hash_idx');
    await queryRunner.query('ALTER TABLE resident_preferences DROP COLUMN IF EXISTS access_token_hash');
  }
}
