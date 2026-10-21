import { describe, expect, it } from 'vitest';
import { isValidCpf, normalizeCpf, normalizeBrazilianPhone } from './security.js';

describe('personal data validation and normalization', () => {
  it('normalizes CPF only for identity lookup and rejects repeated digits', () => {
    expect(normalizeCpf('111.444.777-35')).toBe('11144477735');
    expect(isValidCpf('111.444.777-35')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });

  it('requires a Brazilian phone with DDD and normalizes punctuation', () => {
    expect(normalizeBrazilianPhone('(47) 99999-1234')).toBe('+5547999991234');
    expect(normalizeBrazilianPhone('123')).toBeNull();
  });
});
