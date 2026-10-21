import { randomInt, randomUUID } from 'node:crypto';
import { lookupDigest, encryptField } from '@alertasc/data';

export interface SyntheticIdentity {
  personId: string;
  cpf: string;
  phone: string;
  fullName: string;
  phoneLookupHash: string;
  cpfLookupHash: string | null;
  phoneCiphertext: string;
}

export function makeSyntheticIdentity(includeCpf: boolean): SyntheticIdentity {
  const nine = Array.from({ length: 9 }, () => randomInt(0, 10));
  const firstDigit = cpfDigit(nine, 10);
  const secondDigit = cpfDigit([...nine, firstDigit], 11);
  const cpf = includeCpf ? [...nine, firstDigit, secondDigit].join('') : '';
  const phoneNational = `47${9}${Array.from({ length: 8 }, () => randomInt(0, 10)).join('')}`;
  const phone = `+55${phoneNational}`;
  const lookupKey = requiredSecret('LOOKUP_HMAC_KEY');
  return {
    personId: randomUUID(),
    cpf,
    phone,
    fullName: includeCpf ? 'Operador sintético AlertaSC' : 'Morador sintético de Presidente Getúlio',
    phoneLookupHash: lookupDigest(phone, lookupKey),
    cpfLookupHash: includeCpf ? lookupDigest(cpf, lookupKey) : null,
    phoneCiphertext: encryptField(phone, requiredSecret('FIELD_ENCRYPTION_KEY')),
  };
}

export function formatCpf(cpf: string): string {
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function cpfDigit(values: number[], weightStart: number): number {
  const sum = values.reduce((total, digit, index) => total + digit * (weightStart - index), 0);
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Required runtime setting is missing: ${name}`);
  return value;
}
