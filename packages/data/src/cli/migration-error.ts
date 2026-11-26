export interface SafeMigrationFailure {
  errorName: string;
  code: string;
}

type ErrorRecord = Record<string, unknown>;

export function getSafeMigrationFailure(error: unknown): SafeMigrationFailure {
  const record = asRecord(error);
  return {
    errorName: safeIdentifier(record?.name, /^[A-Za-z][A-Za-z0-9]{0,63}$/) ?? 'UnknownError',
    code: findSafeCode(error) ?? 'UNKNOWN',
  };
}

function findSafeCode(error: unknown, seen = new WeakSet<object>(), depth = 0): string | undefined {
  const record = asRecord(error);
  if (!record || seen.has(record) || depth > 4) return undefined;
  seen.add(record);

  for (const nested of [record.driverError, record.cause, record.originalError]) {
    const code = findSafeCode(nested, seen, depth + 1);
    if (code) return code;
  }

  return safeIdentifier(record.code, /^[A-Za-z0-9][A-Za-z0-9_]{0,31}$/);
}

function asRecord(value: unknown): ErrorRecord | undefined {
  return value !== null && typeof value === 'object' ? value as ErrorRecord : undefined;
}

function safeIdentifier(value: unknown, pattern: RegExp): string | undefined {
  return typeof value === 'string' && pattern.test(value) ? value : undefined;
}
