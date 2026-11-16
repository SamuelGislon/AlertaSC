import type { AlertView } from '../api.js';

export interface PublicAlertReading {
  metric: string;
  value: number;
  unit: string;
  observedAt: string;
}

export interface PublicAlert {
  id: string;
  title: string;
  summary: string;
  area: string;
  status: string;
  generatedAt: string;
  expiresAt: string;
  synthetic: boolean;
  relatedReadings: PublicAlertReading[];
}

export function toPublicAlert(alert: AlertView): PublicAlert {
  return {
    id: alert.id,
    title: alert.title,
    summary: alert.summary,
    area: alert.area,
    status: alert.status,
    generatedAt: alert.generatedAt,
    expiresAt: alert.expiresAt,
    synthetic: alert.synthetic === true,
    relatedReadings: alert.relatedReadings
      .filter((reading) => reading.synthetic === true)
      .map((reading) => ({
        metric: reading.metric,
        value: reading.normalizedValue,
        unit: reading.normalizedUnit,
        observedAt: reading.observedAt,
      })),
  };
}

export function isEligiblePublicAlert(alert: PublicAlert, now: number): boolean {
  const expiry = Date.parse(alert.expiresAt);
  return alert.synthetic && alert.status === 'APPROVED'
    && Number.isFinite(now) && Number.isFinite(expiry) && expiry > now;
}
