import { describe, expect, it } from 'vitest';
import type { AlertView } from '../api.js';
import { isEligiblePublicAlert, toPublicAlert } from './public-alert.js';

const alert: AlertView = {
  id: 'synthetic-rio-indios',
  title: 'Atenção para cheias — Rio Índios',
  summary: 'Demonstração sintética; não representa observações reais.',
  source: 'Fonte interna: fixture RI-01',
  area: 'Rio Índios — Presidente Getúlio/SC',
  status: 'APPROVED',
  generatedAt: '2026-11-16T12:00:00.000Z',
  expiresAt: '2026-11-17T12:00:00.000Z',
  synthetic: true,
  relatedReadings: [{
    source: 'Fonte interna: régua  RI-01',
    metric: 'Nível do Rio Índios',
    rawValue: 450,
    rawUnit: 'cm',
    normalizedValue: 4.5,
    normalizedUnit: 'm',
    observedAt: '2026-11-16T11:55:00.000Z',
    area: 'Rio Índios — Presidente Getúlio/SC',
    synthetic: true,
  }],
};

describe('public alert projection', () => {
  it('exposes only public fields and uses normalized synthetic reading values', () => {
    const withAuditInternals = Object.assign({ ...alert }, {
      auditEvents: [{ action: 'SYNTHETIC_DATA_NORMALIZED', metadata: { source: 'internal-only' } }],
      createdBy: 'operator-internal-id',
    });

    const projected = toPublicAlert(withAuditInternals);

    expect(projected).toEqual({
      id: 'synthetic-rio-indios',
      title: 'Atenção para cheias — Rio Índios',
      summary: 'Demonstração sintética; não representa observações reais.',
      area: 'Rio Índios — Presidente Getúlio/SC',
      status: 'APPROVED',
      generatedAt: '2026-11-16T12:00:00.000Z',
      expiresAt: '2026-11-17T12:00:00.000Z',
      synthetic: true,
      relatedReadings: [{
        metric: 'Nível do Rio Índios',
        value: 4.5,
        unit: 'm',
        observedAt: '2026-11-16T11:55:00.000Z',
      }],
    });
    expect(Object.keys(projected).sort()).toEqual([
      'area', 'expiresAt', 'generatedAt', 'id', 'relatedReadings', 'status', 'summary', 'synthetic', 'title',
    ]);
    expect(JSON.stringify(projected)).not.toContain('Fonte interna');
    expect(JSON.stringify(projected)).not.toContain('450');
    expect(JSON.stringify(projected)).not.toContain('auditEvents');
    expect(JSON.stringify(projected)).not.toContain('operator-internal-id');
  });

  it('allows only synthetic approved alerts whose expiry is after the supplied time', () => {
    const projected = toPublicAlert(alert);
    const now = Date.parse('2026-11-16T13:00:00.000Z');

    expect(isEligiblePublicAlert(projected, now)).toBe(true);
    expect(isEligiblePublicAlert({ ...projected, synthetic: false }, now)).toBe(false);
    expect(isEligiblePublicAlert({ ...projected, status: 'AWAITING_TRIAGE' }, now)).toBe(false);
    expect(isEligiblePublicAlert({ ...projected, status: 'REJECTED' }, now)).toBe(false);
    expect(isEligiblePublicAlert({ ...projected, expiresAt: '2026-11-16T13:00:00.000Z' }, now)).toBe(false);
    expect(isEligiblePublicAlert({ ...projected, expiresAt: 'not-a-date' }, now)).toBe(false);
  });
});
