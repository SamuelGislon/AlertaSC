import { describe, expect, it } from 'vitest';
import { getSafeMigrationFailure } from '../src/cli/migration-error.js';

describe('getSafeMigrationFailure', () => {
  it('extracts a database error code without including messages or connection details', () => {
    const failure = Object.assign(new Error('Database connection failed'), {
      driverError: Object.assign(new Error('password=never-log-this'), {
        code: '28P01',
      }),
    });

    const details = getSafeMigrationFailure(failure);

    expect(details).toEqual({ errorName: 'Error', code: '28P01' });
    expect(JSON.stringify(details)).not.toContain('never-log-this');
    expect(JSON.stringify(details)).not.toContain('password');
  });

  it('finds a safe error code in a nested cause and discards unstructured values', () => {
    const failure = Object.assign(new Error('Outer error with private URL postgresql://user:secret@host/db'), {
      cause: Object.assign(new Error('Driver failure'), {
        code: 'ECONNREFUSED',
      }),
    });

    expect(getSafeMigrationFailure(failure)).toEqual({ errorName: 'Error', code: 'ECONNREFUSED' });
    expect(getSafeMigrationFailure('secret postgresql://user:secret@host/db')).toEqual({ errorName: 'UnknownError', code: 'UNKNOWN' });
  });
});
