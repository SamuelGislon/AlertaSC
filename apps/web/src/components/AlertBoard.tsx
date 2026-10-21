import type { AlertView } from '../api.js';

const labels: Record<string, string> = {
  AWAITING_TRIAGE: 'Aguardando triagem',
  IN_ANALYSIS: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  EXPIRED: 'Expirado',
};

interface AlertBoardProps {
  lockGranted: boolean;
  alerts: AlertView[];
}

export function AlertBoard({ lockGranted, alerts }: AlertBoardProps) {
  if (!lockGranted) {
    return <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      A aba de alertas não está liberada para esta sessão.
    </p>;
  }

  return (
    <section aria-labelledby="alert-queue-title" className="space-y-4">
      <div>
        <h1 id="alert-queue-title" className="text-2xl font-bold">Fila de alertas</h1>
        <p className="text-sm text-slate-600">Conteúdo sintético para desenvolvimento local. Não há publicação externa nesta etapa.</p>
      </div>
      {alerts.length === 0 ? <p className="rounded-xl bg-white p-5 text-slate-600">Nenhum alerta sintético disponível.</p> : (
        <ul className="grid gap-3">
          {alerts.map((alert) => <li key={alert.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-semibold">{alert.title}</h2>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sm">{labels[alert.status] ?? alert.status}</span>
            </div>
            <p className="mt-2 text-slate-700">{alert.summary}</p>
            <p className="mt-3 text-xs text-slate-500">{alert.area} · {alert.source} · Expira em {new Date(alert.expiresAt).toLocaleString('pt-BR')}</p>
          </li>)}
        </ul>
      )}
    </section>
  );
}
