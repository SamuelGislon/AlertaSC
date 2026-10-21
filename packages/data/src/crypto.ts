import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

function encryptionKey(value: string): Buffer {
  const key = Buffer.from(value, 'utf8');
  if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must contain exactly 32 UTF-8 bytes');
  return key;
}

export function encryptField(plainText: string, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptField(payload: string, key: string): string {
  const [encodedIv, encodedTag, encodedData] = payload.split('.');
  if (!encodedIv || !encodedTag || encodedData === undefined) throw new Error('Encrypted field has an invalid format');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(key), Buffer.from(encodedIv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedData, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function lookupDigest(value: string, key: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}
