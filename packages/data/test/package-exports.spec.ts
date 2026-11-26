import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workspacePackages = [
  new URL('../package.json', import.meta.url),
  new URL('../../domain/package.json', import.meta.url),
];

describe('workspace package runtime exports', () => {
  it('uses source for types and development, and compiled JavaScript for production imports', () => {
    for (const packageUrl of workspacePackages) {
      const packageJson = JSON.parse(readFileSync(packageUrl, 'utf8')) as {
        exports: { '.': unknown };
      };

      expect(packageJson.exports['.']).toEqual({
        types: './src/index.ts',
        development: './src/index.ts',
        import: './dist/index.js',
      });
    }
  });
});
