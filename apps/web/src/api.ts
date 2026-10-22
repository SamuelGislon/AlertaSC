export interface OperatorSession { id: string; roles: string[]; }
export interface AlertView {
  id: string;
  title: string;
  summary: string;
  source: string;
  area: string;
  status: string;
  generatedAt: string;
  expiresAt: string;
  synthetic: true;
  relatedReadings: Array<{
    source: string;
    metric: string;
    rawValue: number;
    rawUnit: string;
    normalizedValue: number;
    normalizedUnit: string;
    observedAt: string;
    area: string;
    synthetic: true;
  }>;
}
export type ReviewDecision = 'APPROVED' | 'REJECTED';
export interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  occurredAt: string;
  previousState: string | null;
  newState: string | null;
  reason: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}
export interface SyntheticOperator {
  id: string;
  active: boolean;
  synthetic: true;
  roles: string[];
}
export interface NewSyntheticOperator extends SyntheticOperator {
  oneTimeCredentials: { cpf: string; password: string };
}
export interface CitizenFixture {
  id: string;
  active: boolean;
  synthetic: true;
  municipalities: string[];
  eventTypes: string[];
  channels: string[];
}
export interface CitizenPreferences extends CitizenFixture {
  consent: boolean;
  consentedAt: string;
}
export interface CitizenDemoSession {
  id: string;
  synthetic: true;
  accessToken: string;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<string> | null = null;
const apiBase = import.meta.env.VITE_API_BASE_URL || '';

export function setAccessToken(token: string | null): void { accessToken = token; }
export function currentAccessToken(): string | null { return accessToken; }

async function apiRequest<T>(path: string, init: RequestInit = {}, retryAfterRefresh = true): Promise<T> {
  const headers = new Headers(init.headers);
  const usesOperatorAccessToken = Boolean(accessToken && !headers.has('Authorization'));
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (usesOperatorAccessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${apiBase}/api/v1${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retryAfterRefresh && usesOperatorAccessToken && !path.startsWith('/auth/')) {
    try {
      await api.refresh();
    } catch {
      setAccessToken(null);
      throw new Error('Credenciais inválidas.');
    }
    return apiRequest<T>(path, init, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || 'Não foi possível concluir a operação.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  async login(cpf: string, password: string) {
    const result = await apiRequest<{ accessToken: string; operator: OperatorSession }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ cpf, password }),
    });
    setAccessToken(result.accessToken);
    return result.operator;
  },
  refresh() {
    if (!refreshInFlight) {
      refreshInFlight = apiRequest<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
        .then(({ accessToken: refreshedToken }) => {
          setAccessToken(refreshedToken);
          return refreshedToken;
        })
        .finally(() => { refreshInFlight = null; });
    }
    return refreshInFlight;
  },
  async logout() {
    try { await apiRequest<void>('/auth/logout', { method: 'POST' }); }
    finally { setAccessToken(null); }
  },
  acquireAlertTab: () => apiRequest<{ acquired: true }>('/alert-tab/acquire', { method: 'POST' }),
  releaseAlertTab: () => apiRequest<{ released: boolean }>('/alert-tab/release', { method: 'POST' }),
  alerts: () => apiRequest<AlertView[]>('/alerts'),
  claimAlert: (id: string) => apiRequest<{ claimed: true }>(`/alerts/${id}/claim`, { method: 'POST' }),
  transitionAlert: (id: string, status: ReviewDecision, reason: string) =>
    apiRequest<{ status: string }>(`/alerts/${id}/transition`, {
      method: 'POST', body: JSON.stringify({ status, reason }),
    }),
  simulateDelivery: (id: string) => apiRequest<{ synthetic: true; simulated: true; eligibleCount: number; message: string }>(
    `/alerts/${id}/simulate-delivery`, { method: 'POST' },
  ),
  alertAudit: (id: string) => apiRequest<AuditEvent[]>(`/alerts/${id}/audit`),
  recoverAlertTab: (reason: string) => apiRequest<{ recovered: true }>('/alert-tab/recover', {
    method: 'POST', body: JSON.stringify({ reason }),
  }),
  operators: () => apiRequest<SyntheticOperator[]>('/admin/operators'),
  createOperatorFixture: (fixtureKey: string) => apiRequest<NewSyntheticOperator>('/admin/operators/fixtures', {
    method: 'POST', body: JSON.stringify({ fixtureKey }),
  }),
  disableOperator: (id: string) => apiRequest<{ disabled: true }>(`/admin/operators/${id}/disable`, { method: 'PATCH' }),
  createCitizenFixture: (fixtureKey: string) => apiRequest<CitizenFixture>('/admin/citizens/fixtures', {
    method: 'POST', body: JSON.stringify({ fixtureKey }),
  }),
  citizens: () => apiRequest<CitizenFixture[]>('/admin/citizens'),
  removeCitizen: (id: string) => apiRequest<void>(`/admin/citizens/${id}`, { method: 'DELETE' }),
  createCitizenDemo: (fixtureKey: string) => apiRequest<CitizenDemoSession>('/citizens/fixtures', {
    method: 'POST', body: JSON.stringify({ fixtureKey }),
  }),
  citizenMe: (token: string) => apiRequest<CitizenPreferences>('/citizens/me', {
    headers: { Authorization: `Bearer ${token}` },
  }),
  updateCitizenPreferences: (token: string, preferences: Pick<CitizenPreferences, 'municipalities' | 'eventTypes' | 'channels'>) =>
    apiRequest<CitizenPreferences>('/citizens/me/preferences', {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        municipalityCodes: preferences.municipalities,
        eventTypes: preferences.eventTypes,
        channels: preferences.channels,
      }),
    }),
  removeCitizenSelf: (token: string) => apiRequest<void>('/citizens/me', {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  }),
};
