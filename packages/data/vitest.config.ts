import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    exclude: [...configDefaults.exclude, 'test/**/*.integration.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
