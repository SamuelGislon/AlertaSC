import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/domain/vitest.config.ts',
  'packages/data/vitest.config.ts',
  'apps/api/vitest.config.ts',
  'apps/web/vite.config.ts',
  'apps/worker/vitest.config.ts',
]);
