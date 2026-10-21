import { describe, expect, it } from 'vitest';
import { decryptField, encryptField, lookupDigest } from '../src/crypto.js';

describe('sensitive field protection', () => {
  const encryptionKey = '0123456789abcdef0123456789abcdef';
  const lookupKey = 'synthetic-test-key-not-for-production-000000000000';

  it('encrypts recoverable contact fields and uses authenticated encryption', () => {
    const encrypted = encryptField('+5547999990000', encryptionKey);
    expect(encrypted).not.toContain('+5547999990000');
    expect(decryptField(encrypted, encryptionKey)).toBe('+5547999990000');
    expect(() => decryptField(encrypted, 'abcdef0123456789abcdef0123456789')).toThrow();
  });

  it('generates a stable keyed digest for protected equality lookup', () => {
    expect(lookupDigest('00000000000', lookupKey)).toBe(lookupDigest('00000000000', lookupKey));
    expect(lookupDigest('00000000000', lookupKey)).not.toContain('00000000000');
  });
});
