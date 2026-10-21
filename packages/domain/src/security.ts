export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (!/^\d{11}$/.test(cpf) || /^([0-9])\1{10}$/.test(cpf)) return false;

  const digits = [...cpf].map(Number);
  const calculate = (length: number): number => {
    const sum = digits.slice(0, length).reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculate(9) === digits[9] && calculate(10) === digits[10];
}

export function normalizeBrazilianPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('55') && digits.length === 13 ? digits.slice(2) : digits;
  if (!/^[1-9]\d9\d{8}$/.test(national)) return null;
  return `+55${national}`;
}
