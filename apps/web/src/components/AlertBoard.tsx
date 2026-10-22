import { useState, type FormEvent } from 'react';
import type { AlertView, AuditEvent, ReviewDecision } from '../api.js';

const statusLabels: Record<string, string> = {
  AWAITING_TRIAGE: 'Aguardando Triagem',
  IN_ANALYSIS: 'Em Análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  EXPIRED: 'Expirado',
};

const auditLabels: Record<string, string> = {
  SYNTHETIC_SOURCE_DATA_RECEIVED: 'Dados sintéticos recebidos',
  SYNTHETIC_DATA_NORMALIZED: 'Leitura sintética normalizada',
  SYNTHETIC_ALERT_GENERATED: 'Alerta sintético gerado',
  ALERT_CLAIMED: 'Alerta assumido para análise',
  ALERT_STATUS_CHANGED: 'Estado do alerta alterado',
  ALERT_EXPIRED: 'Alerta expirado',
  ALERT_CLAIM_RELEASED: 'Análise liberada',
  SYNTHETIC_DELIVERY_SIMULATED: 'Entrega sintética simulada',
};

interface AlertBoardProps {
  lockGranted: boolean;
  alerts: AlertView[];
  onClaim: (alertId: string) => Promise<void>;
  onTransition: (alertId: string, status: ReviewDecision, reason: string) => Promise<string>;
  onLoadAudit: (alertId: string) => Promise<AuditEvent[]>;
  onSimulateDelivery: (alertId: string) => Promise<{ eligibleCount: number; message: string }>;
  lockError?: string | null;
  canRecover?: boolean;
  onRecover?: (reason: string) => Promise<void>;
}

export function AlertBoard({
  lockGranted, alerts, onClaim, onTransition, onLoadAudit, onSimulateDelivery,
  lockError, canRecover = false, onRecover,
}: AlertBoardProps) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState<Record<string, boolean>>({});
  const [auditEvents, setAuditEvents] = useState<Record<string, AuditEvent[]>>({});
  const [deliveryMessages, setDeliveryMessages] = useState<Record<string, string>>({});
  const [recoveryReason, setRecoveryReason] = useState('');
  const statusOf = (alert: AlertView) => statuses[alert.id] ?? alert.status;

  async function claim(alert: AlertView) {
    setBusyId(alert.id);
    setError(null);
    try {
      await onClaim(alert.id);
      setStatuses((previous) => ({ ...previous, [alert.id]: 'IN_ANALYSIS' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível assumir o alerta.');
    } finally {
      setBusyId(null);
    }
  }

  async function decide(alertId: string, target: ReviewDecision) {
    const reason = reasons[alertId]?.trim() ?? '';
    if (reason.length < 3) return;
    setBusyId(alertId);
    setError(null);
    try {
      const result = await onTransition(alertId, target, reason);
      setStatuses((previous) => ({ ...previous, [alertId]: result }));
      setReasons((previous) => ({ ...previous, [alertId]: '' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a decisão.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAudit(alertId: string) {
    const nextOpen = !auditOpen[alertId];
    setAuditOpen((previous) => ({ ...previous, [alertId]: nextOpen }));
    if (nextOpen && !auditEvents[alertId]) {
      try {
        const events = await onLoadAudit(alertId);
        setAuditEvents((previous) => ({ ...previous, [alertId]: events }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a auditoria.');
      }
    }
  }

  async function simulateDelivery(alertId: string) {
    setBusyId(alertId);
    setError(null);
    try {
      const result = await onSimulateDelivery(alertId);
      setDeliveryMessages((previous) => ({ ...previous, [alertId]: result.message }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível simular a entrega local.');
    } finally {
      setBusyId(null);
    }
  }

  async function recoverLock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onRecover || recoveryReason.trim().length < 3) return;
    setBusyId('lock-recovery');
    setError(null);
    try {
      await onRecover(recoveryReason.trim());
      setRecoveryReason('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível recuperar o bloqueio.');
    } finally {
      setBusyId(null);
    }
  }

  if (!lockGranted) {
    return <section className="space-y-4" aria-label="Acesso à aba de alertas">
      <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        A aba de alertas não está liberada para esta sessão.
      </p>
      {lockError && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950">{lockError}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950">{error}</p>}
      {canRecover && lockError && <form onSubmit={(event) => void recoverLock(event)} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium" htmlFor="lock-recovery-reason">Justificativa para recuperação administrativa</label>
        <textarea id="lock-recovery-reason" value={recoveryReason} onChange={(event) => setRecoveryReason(event.target.value)}
          maxLength={300} rows={3} className="w-full rounded-lg border border-slate-300 p-3" />
        <p className="text-xs text-slate-600">A ação será registrada na auditoria. Não inclua dados pessoais ou credenciais.</p>
        <button type="submit" disabled={!onRecover || recoveryReason.trim().length < 3 || busyId === 'lock-recovery'}
          className="rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white disabled:opacity-50">
          Recuperar bloqueio
        </button>
      </form>}
    </section>;
  }

  return <section aria-labelledby="alert-queue-title" className="space-y-4">
    <div>
      <h1 id="alert-queue-title" className="text-2xl font-bold">Fila de alertas</h1>
      <p className="text-sm text-slate-600">Conteúdo sintético para desenvolvimento local. Não há publicação externa nesta etapa.</p>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950">{error}</p>}
    {alerts.length === 0 ? <p className="rounded-xl bg-white p-5 text-slate-600">Nenhum alerta sintético disponível.</p> : (
      <ul className="grid gap-3">
        {alerts.map((alert) => {
          const status = statusOf(alert);
          return <li key={alert.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-semibold">{alert.title}</h2>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm">{statusLabels[status] ?? status}</span>
            </div>
            <p className="mt-2 text-slate-700">{alert.summary}</p>
            <p className="mt-2 text-xs italic text-slate-500">Incerteza: conteúdo sintético, sem leitura observada nem validação por fonte externa nesta etapa.</p>
            <dl className="mt-3 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
              <div><dt className="inline font-semibold">Área: </dt><dd className="inline">{alert.area}</dd></div>
              <div><dt className="inline font-semibold">Origem: </dt><dd className="inline">{alert.source}</dd></div>
              <div><dt className="inline font-semibold">Gerado em: </dt><dd className="inline">{new Date(alert.generatedAt).toLocaleString('pt-BR')}</dd></div>
              <div><dt className="inline font-semibold">Expira em: </dt><dd className="inline">{new Date(alert.expiresAt).toLocaleString('pt-BR')}</dd></div>
            </dl>

            {alert.relatedReadings.length > 0 && <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">Leituras relacionadas (sintéticas)</p>
              <ul className="mt-1 space-y-1 text-xs text-slate-600">
                {alert.relatedReadings.map((reading, index) => <li key={`${reading.metric}-${index}`}>
                  {reading.metric}: {reading.rawValue} {reading.rawUnit} → {reading.normalizedValue} {reading.normalizedUnit}
                  {' · '}{reading.source}{' · '}{new Date(reading.observedAt).toLocaleString('pt-BR')}
                </li>)}
              </ul>
            </div>}

            {status === 'AWAITING_TRIAGE' && <button disabled={busyId === alert.id} onClick={() => void claim(alert)}
              className="mt-4 rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white disabled:opacity-50">Assumir alerta</button>}
            {status === 'IN_ANALYSIS' && <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium" htmlFor={`decision-reason-${alert.id}`}>Motivo da decisão</label>
              <textarea id={`decision-reason-${alert.id}`} value={reasons[alert.id] ?? ''}
                onChange={(event) => setReasons((previous) => ({ ...previous, [alert.id]: event.target.value }))}
                maxLength={300} rows={3} className="w-full rounded-lg border border-slate-300 p-3" />
              <p className="text-xs text-slate-600">A decisão não publica nem envia o alerta. Não inclua dados pessoais ou credenciais.</p>
              <div className="flex flex-wrap gap-2">
                <button disabled={(reasons[alert.id]?.trim().length ?? 0) < 3 || busyId === alert.id}
                  onClick={() => void decide(alert.id, 'APPROVED')} className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white disabled:opacity-50">Aprovar</button>
                <button disabled={(reasons[alert.id]?.trim().length ?? 0) < 3 || busyId === alert.id}
                  onClick={() => void decide(alert.id, 'REJECTED')} className="rounded-lg border border-rose-700 px-4 py-2 font-semibold text-rose-900 disabled:opacity-50">Reprovar</button>
              </div>
            </div>}
            {status === 'APPROVED' && <div className="mt-4 space-y-2">
              <button disabled={busyId === alert.id} onClick={() => void simulateDelivery(alert.id)}
                className="rounded-lg border border-sky-800 px-4 py-2 font-semibold text-sky-900 disabled:opacity-50">
                Simular entrega local
              </button>
              <p className="text-xs text-slate-600">Usa apenas cadastros sintéticos ativos e consentidos. Não envia mensagens nem chama serviços externos.</p>
              {deliveryMessages[alert.id] && <p role="status" className="text-sm text-emerald-900">{deliveryMessages[alert.id]}</p>}
            </div>}

            <div className="mt-4 border-t border-slate-100 pt-3">
              <button onClick={() => void toggleAudit(alert.id)} aria-expanded={auditOpen[alert.id] ?? false}
                className="text-sm font-medium text-sky-900 underline">Histórico da auditoria</button>
              {auditOpen[alert.id] && <ol className="mt-3 space-y-2" aria-label={`Histórico de ${alert.title}`}>
                {(auditEvents[alert.id] ?? []).map((event) => <li key={event.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-medium">{auditLabels[event.action] ?? event.action}</p>
                  <p className="text-xs text-slate-600">{new Date(event.occurredAt).toLocaleString('pt-BR')}
                    {event.previousState || event.newState ? ` · ${statusLabels[event.previousState ?? ''] ?? event.previousState ?? '—'} → ${statusLabels[event.newState ?? ''] ?? event.newState ?? '—'}` : ''}</p>
                  <p className="text-xs text-slate-600">Responsável: {event.actorId ?? 'Sistema'}</p>
                  {event.reason && <p className="mt-1">Motivo: {event.reason}</p>}
                  {event.metadata && <p className="mt-1 text-xs text-slate-600">{[
                    event.metadata.source,
                    event.metadata.metric,
                    event.metadata.value !== undefined ? `${event.metadata.value} ${event.metadata.unit ?? ''}`.trim() : null,
                    event.metadata.channel,
                    event.metadata.count !== undefined ? `Cadastros elegíveis: ${event.metadata.count}` : null,
                  ].filter((part) => part !== undefined && part !== null).join(' · ')}</p>}
                </li>)}
                {auditEvents[alert.id]?.length === 0 && <li className="text-sm text-slate-600">Nenhum evento de auditoria.</li>}
              </ol>}
            </div>
          </li>;
        })}
      </ul>
    )}
  </section>;
}
