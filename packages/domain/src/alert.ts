export const ALERT_STATUSES = [
  'AWAITING_TRIAGE',
  'IN_ANALYSIS',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
] as const;

export type AlertStatus = (typeof ALERT_STATUSES)[number];

export interface AlertRecord {
  id: string;
  status: AlertStatus;
  generatedAt: Date;
  expiresAt: Date;
}

const LIFETIME_MS = 24 * 60 * 60 * 1_000;

const TRANSITIONS: Record<AlertStatus, readonly AlertStatus[]> = {
  AWAITING_TRIAGE: ['IN_ANALYSIS', 'EXPIRED'],
  IN_ANALYSIS: ['APPROVED', 'REJECTED', 'EXPIRED'],
  APPROVED: ['EXPIRED'],
  REJECTED: ['EXPIRED'],
  EXPIRED: [],
};

export function addAlertLifetime(generatedAt: Date): Date {
  return new Date(generatedAt.getTime() + LIFETIME_MS);
}

export function isAllowedAlertTransition(from: AlertStatus, to: AlertStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function effectiveAlertStatus(alert: AlertRecord, now: Date): AlertStatus {
  if (alert.status !== 'EXPIRED' && now.getTime() >= alert.expiresAt.getTime()) return 'EXPIRED';
  return alert.status;
}
