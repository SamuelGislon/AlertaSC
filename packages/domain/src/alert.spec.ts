import { describe, expect, it } from 'vitest';
import {
  addAlertLifetime,
  effectiveAlertStatus,
  isAllowedAlertTransition,
  type AlertRecord,
} from './alert.js';

const start = new Date('2026-10-21T12:00:00.000Z');

function alert(status: AlertRecord['status'] = 'AWAITING_TRIAGE'): AlertRecord {
  return {
    id: 'synthetic-alert-1',
    status,
    generatedAt: start,
    expiresAt: addAlertLifetime(start),
  };
}

describe('alert lifecycle', () => {
  it('expires exactly 24 hours after generation, without waiting for a worker', () => {
    const candidate = alert();
    expect(candidate.expiresAt.toISOString()).toBe('2026-10-22T12:00:00.000Z');
    expect(effectiveAlertStatus(candidate, new Date('2026-10-22T11:59:59.999Z'))).toBe('AWAITING_TRIAGE');
    expect(effectiveAlertStatus(candidate, candidate.expiresAt)).toBe('EXPIRED');
  });

  it('allows only the approved review transitions', () => {
    expect(isAllowedAlertTransition('AWAITING_TRIAGE', 'IN_ANALYSIS')).toBe(true);
    expect(isAllowedAlertTransition('IN_ANALYSIS', 'APPROVED')).toBe(true);
    expect(isAllowedAlertTransition('IN_ANALYSIS', 'REJECTED')).toBe(true);
    expect(isAllowedAlertTransition('AWAITING_TRIAGE', 'APPROVED')).toBe(false);
    expect(isAllowedAlertTransition('APPROVED', 'REJECTED')).toBe(false);
    expect(isAllowedAlertTransition('REJECTED', 'IN_ANALYSIS')).toBe(false);
    expect(isAllowedAlertTransition('EXPIRED', 'APPROVED')).toBe(false);
  });

  it('does not change persisted status when effective status is expired', () => {
    const candidate = alert('IN_ANALYSIS');
    expect(effectiveAlertStatus(candidate, candidate.expiresAt)).toBe('EXPIRED');
    expect(candidate.status).toBe('IN_ANALYSIS');
  });
});
