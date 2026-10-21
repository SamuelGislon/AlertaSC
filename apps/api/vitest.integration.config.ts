import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../../.env') });
if (!process.env.DATABASE_TEST_URL && process.env.POSTGRES_PASSWORD) {
  const user = encodeURIComponent(process.env.POSTGRES_USER ?? 'alertasc');
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD);
  const port = process.env.POSTGRES_PORT ?? '54329';
  process.env.DATABASE_TEST_URL = `postgresql://${user}:${password}@127.0.0.1:${port}/alertasc_test`;
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.integration.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
