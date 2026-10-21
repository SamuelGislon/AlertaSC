import { afterEach, describe, expect, it, vi } from 'vitest';
import { SafeLogger } from './safe-logger.js';
import { safeReviewReason } from './reason.js';

describe('safe logging and audit reason handling', () => {
  afterEach(() => vi.restoreAllMocks());

  it('writes only an event code and timestamp, never arbitrary messages or values', () => {
    const output: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
      output.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);

    new SafeLogger().error('CPF 111.444.777-35 senha secreta abc-token-123');

    expect(output.join('')).not.toContain('111.444.777-35');
    expect(output.join('')).not.toContain('secreta');
    expect(JSON.parse(output[0]!).event).toBe('framework_event');
  });

  it('rejects review text that contains recognizable personal or credential data', () => {
    expect(() => safeReviewReason('Verificar o telefone (47) 99999-1234')).toThrow();
    expect(() => safeReviewReason('O sensor apresentou leitura inconsistente')).not.toThrow();
  });
});
