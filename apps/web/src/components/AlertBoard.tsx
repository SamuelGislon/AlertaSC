import { useState, type FormEvent } from 'react';
import { Activity, BellRing, CircleCheck, CircleX, ClipboardList, Clock, Download, EllipsisVertical, Eye, Share2, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.js';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.js';
import { Field, FieldLabel } from '@/components/ui/field.js';
import { Textarea } from '@/components/ui/textarea.js';
import { notifySuccess } from '@/components/ui/toast.js';
import type { AlertView, AuditEvent, ReviewDecision } from '../api.js';
import { buildAlertPosterSvg, canExportAlertPoster, downloadAlertPoster, shareAlertPoster, type AlertPosterFormat, type ManualShareResult } from '../lib/alert-poster.js';

const statusLabels: Record<string, string> = {
  AWAITING_TRIAGE: 'Aguardando Triagem',
  IN_ANALYSIS: 'Em Análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  EXPIRED: 'Expirado',
};

const statusIcons: Record<string, LucideIcon> = {
  AWAITING_TRIAGE: Clock,
  IN_ANALYSIS: Activity,
  APPROVED: CircleCheck,
  REJECTED: CircleX,
  EXPIRED: TriangleAlert,
};

const statusTones: Record<string, string> = {
  AWAITING_TRIAGE: 'status-warn',
  IN_ANALYSIS: 'status-info',
  APPROVED: 'status-good',
  REJECTED: 'status-error',
  EXPIRED: 'status-error',
};

const auditLabels: Record<string, string> = {
  SYNTHETIC_SOURCE_DATA_RECEIVED: 'Dados API recebidos',
  SYNTHETIC_DATA_NORMALIZED: 'Leitura sintética normalizada',
  SYNTHETIC_ALERT_GENERATED: 'Alerta gerado por IA gerado',
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
  onViewPublicPreview?: (alertId: string) => void;
  onExportPoster?: (alert: AlertView, format: AlertPosterFormat) => Promise<void>;
  onSharePoster?: (alert: AlertView) => Promise<ManualShareResult>;
  lockError?: string | null;
  canRecover?: boolean;
  onRecover?: (reason: string) => Promise<void>;
}

export function AlertBoard({
  lockGranted, alerts, onClaim, onTransition, onLoadAudit, onSimulateDelivery,
  onViewPublicPreview, onExportPoster, onSharePoster, lockError, canRecover = false, onRecover,
}: AlertBoardProps) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [claimedAlertIds, setClaimedAlertIds] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState<Record<string, boolean>>({});
  const [auditEvents, setAuditEvents] = useState<Record<string, AuditEvent[]>>({});
  const [deliveryMessages, setDeliveryMessages] = useState<Record<string, string>>({});
  const [exportMessages, setExportMessages] = useState<Record<string, string>>({});
  const [recoveryReason, setRecoveryReason] = useState('');
  const [previewAlertId, setPreviewAlertId] = useState<string | null>(null);
  const statusOf = (alert: AlertView) => statuses[alert.id] ?? alert.status;

  async function claim(alert: AlertView) {
    const resuming = statusOf(alert) === 'IN_ANALYSIS';
    setBusyId(alert.id);
    setError(null);
    try {
      await onClaim(alert.id);
      setClaimedAlertIds((previous) => ({ ...previous, [alert.id]: true }));
      setStatuses((previous) => ({ ...previous, [alert.id]: 'IN_ANALYSIS' }));
      notifySuccess(resuming ? 'Análise retomada' : 'Alerta assumido para análise');
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
      notifySuccess(target === 'APPROVED' ? 'Alerta aprovado' : 'Alerta reprovado');
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
      notifySuccess('Entrega sintética simulada');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível simular a entrega local.');
    } finally {
      setBusyId(null);
    }
  }

  async function exportPoster(alert: AlertView, format: AlertPosterFormat) {
    setBusyId(alert.id);
    setError(null);
    setExportMessages((previous) => ({ ...previous, [alert.id]: '' }));
    try {
      await (onExportPoster ?? downloadAlertPoster)(alert, format);
      setExportMessages((previous) => ({ ...previous, [alert.id]: `Comunicado ${format.toUpperCase()} gerado para download.` }));
      notifySuccess(`Comunicado ${format.toUpperCase()} pronto`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar o comunicado.');
    } finally {
      setBusyId(null);
    }
  }

  async function sharePoster(alert: AlertView) {
    setBusyId(alert.id);
    setError(null);
    setExportMessages((previous) => ({ ...previous, [alert.id]: '' }));
    try {
      const result = await (onSharePoster ?? shareAlertPoster)(alert);
      const messages: Record<ManualShareResult, string> = {
        shared: 'Seletor do dispositivo aberto; revise o destino e confirme a publicação. Nada é publicado automaticamente.',
        downloaded: 'Compartilhamento de arquivo indisponível neste navegador; o PNG foi baixado para publicação manual.',
        cancelled: 'Compartilhamento cancelado. Nenhuma publicação foi realizada.',
      };
      setExportMessages((previous) => ({ ...previous, [alert.id]: messages[result] }));
      if (result !== 'cancelled') notifySuccess(result === 'shared' ? 'Seletor de compartilhamento aberto' : 'Arquivo pronto para publicação manual');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível preparar o compartilhamento.');
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
      <Alert role="status" className="notice notice-warn"><Clock className="notice-icon" aria-hidden="true" /><AlertDescription>A aba de alertas não está liberada para esta sessão.</AlertDescription></Alert>
      {lockError && <Alert variant="destructive" className="notice notice-error"><TriangleAlert className="notice-icon" aria-hidden="true" /><AlertDescription>{lockError}</AlertDescription></Alert>}
      {error && <Alert variant="destructive" className="notice notice-error"><TriangleAlert className="notice-icon" aria-hidden="true" /><AlertDescription>{error}</AlertDescription></Alert>}
      {canRecover && lockError && <form onSubmit={(event) => void recoverLock(event)}>
        <Card className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <Field>
            <FieldLabel htmlFor="lock-recovery-reason">Justificativa para recuperação administrativa</FieldLabel>
            <Textarea id="lock-recovery-reason" value={recoveryReason} onChange={(event) => setRecoveryReason(event.target.value)}
              maxLength={300} rows={3} className="w-full" />
          </Field>
          <p className="text-xs text-slate-600">A ação será registrada na auditoria. Não inclua dados pessoais ou credenciais.</p>
          <Button type="submit" disabled={!onRecover || recoveryReason.trim().length < 3 || busyId === 'lock-recovery'} className="button button-primary">
            <Activity size={16} aria-hidden="true" />Recuperar bloqueio
          </Button>
        </Card>
      </form>}
    </section>;
  }

  return <section aria-labelledby="alert-queue-title" className="space-y-4">
    <div>
      <h1 id="alert-queue-title" className="text-2xl font-bold">Fila de alertas</h1>
      <p className="text-sm text-slate-600">Conteúdo gerado por IA para desenvolvimento local. Não há publicação externa nesta etapa.</p>
    </div>
    {error && <Alert variant="destructive" className="notice notice-error"><TriangleAlert className="notice-icon" aria-hidden="true" /><AlertDescription>{error}</AlertDescription></Alert>}
    {alerts.length === 0 ? <Card className="rounded-xl bg-white p-5 text-slate-600">Nenhum alerta gerado por IA disponível.</Card> : (
      <ul className="grid gap-3">
        {alerts.map((alert) => {
          const status = statusOf(alert);
          const canExportPoster = canExportAlertPoster({ ...alert, status });
          const posterPreview = canExportPoster ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildAlertPosterSvg(alert))}` : null;
          const StatusIcon = statusIcons[status] ?? Activity;
          return <li key={alert.id}>
            <Card className="alert-item rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-semibold">{alert.title}</h2>
              <Badge variant="secondary" className={`status-chip ${statusTones[status] ?? 'status-info'}`}><StatusIcon size={14} aria-hidden="true" />{statusLabels[status] ?? status}</Badge>
            </div>
            <p className="mt-2 text-slate-700">{alert.summary}</p>
            <p className="mt-2 text-xs italic text-slate-500">Incerteza: conteúdo gerado por IA, sem leitura observada nem validação por fonte externa nesta etapa.</p>
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

            {status === 'AWAITING_TRIAGE' && <Button disabled={busyId === alert.id} onClick={() => void claim(alert)}
              className="mt-4 button button-primary"><Activity size={16} aria-hidden="true" />Assumir alerta</Button>}
            {status === 'IN_ANALYSIS' && !claimedAlertIds[alert.id] && <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-600">Retome a análise para vincular este alerta à sua sessão antes de decidir.</p>
              <Button disabled={busyId === alert.id} onClick={() => void claim(alert)}
                className="button button-primary"><Activity size={16} aria-hidden="true" />Continuar análise</Button>
            </div>}
            {status === 'IN_ANALYSIS' && claimedAlertIds[alert.id] && <div className="mt-4 space-y-3">
              <Field>
                <FieldLabel htmlFor={`decision-reason-${alert.id}`}>Motivo da decisão</FieldLabel>
                <Textarea id={`decision-reason-${alert.id}`} value={reasons[alert.id] ?? ''}
                onChange={(event) => setReasons((previous) => ({ ...previous, [alert.id]: event.target.value }))}
                maxLength={300} rows={3} className="w-full" />
              </Field>
              <p className="text-xs text-slate-600">A decisão não publica nem envia o alerta. Não inclua dados pessoais ou credenciais.</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={(reasons[alert.id]?.trim().length ?? 0) < 3 || busyId === alert.id}
                  onClick={() => void decide(alert.id, 'APPROVED')} className="button button-primary"><CircleCheck size={16} aria-hidden="true" />Aprovar</Button>
                <Button variant="destructive" disabled={(reasons[alert.id]?.trim().length ?? 0) < 3 || busyId === alert.id}
                  onClick={() => void decide(alert.id, 'REJECTED')} className="button button-danger"><CircleX size={16} aria-hidden="true" />Reprovar</Button>
              </div>
            </div>}
            {status === 'APPROVED' && <div className="mt-4 space-y-2">
              {canExportPoster && onViewPublicPreview && <Button type="button" variant="outline" className="button button-outline"
                onClick={() => onViewPublicPreview(alert.id)}><Eye size={16} aria-hidden="true" />Ver no painel público</Button>}
              {posterPreview && <Dialog open={previewAlertId === alert.id}
                onOpenChange={(open) => setPreviewAlertId(open ? alert.id : null)}>
                <DialogTrigger render={<Button type="button" variant="outline" className="button button-outline" />}>
                  <Eye size={16} aria-hidden="true" />Pré-visualizar arte do comunicado
                </DialogTrigger>
                <DialogContent className="poster-preview-dialog">
                  <DialogHeader>
                    <DialogTitle>Pré-visualização do comunicado</DialogTitle>
                    <DialogDescription>Arte sintética do alerta aprovado. Revise antes de baixar ou compartilhar manualmente.</DialogDescription>
                  </DialogHeader>
                  <img className="w-full rounded-lg border border-slate-200" src={posterPreview} alt="Prévia do comunicado gerado por IA aprovado" />
                </DialogContent>
              </Dialog>}
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" variant="outline" className="button button-outline" />}>
                  <EllipsisVertical size={16} aria-hidden="true" />Mais ações do comunicado
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {canExportPoster && <>
                    <DropdownMenuItem disabled={busyId === alert.id} onClick={() => void exportPoster(alert, 'png')}>
                      <Download size={16} aria-hidden="true" />Baixar comunicado em PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={busyId === alert.id} onClick={() => void exportPoster(alert, 'jpeg')}>
                      <Download size={16} aria-hidden="true" />Baixar comunicado em JPEG
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={busyId === alert.id} onClick={() => void sharePoster(alert)}>
                      <Share2 size={16} aria-hidden="true" />Compartilhar manualmente
                    </DropdownMenuItem>
                  </>}
                  <DropdownMenuItem disabled={busyId === alert.id} onClick={() => void simulateDelivery(alert.id)}>
                    <BellRing size={16} aria-hidden="true" />Simular entrega local
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {exportMessages[alert.id] && <Alert role="status" className="notice notice-success"><CircleCheck className="notice-icon" aria-hidden="true" /><AlertDescription>{exportMessages[alert.id]}</AlertDescription></Alert>}
              <p className="text-xs text-slate-600">A arte usa somente o conteúdo aprovado e exibe um aviso de demonstração sintética. O compartilhamento abre o seletor do dispositivo para você confirmar; não há publicação automática.</p>
              <p className="text-xs text-slate-600">Usa apenas cadastros API ativos e consentidos. Não envia mensagens nem chama serviços externos.</p>
              {deliveryMessages[alert.id] && <Alert role="status" className="notice notice-success"><CircleCheck className="notice-icon" aria-hidden="true" /><AlertDescription>{deliveryMessages[alert.id]}</AlertDescription></Alert>}
            </div>}

            <div className="mt-4 border-t border-slate-100 pt-3">
              <Button variant="ghost" onClick={() => void toggleAudit(alert.id)} aria-expanded={auditOpen[alert.id] ?? false}
                className="button button-quiet"><ClipboardList size={16} aria-hidden="true" />Histórico da auditoria</Button>
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
            </Card>
          </li>;
        })}
      </ul>
    )}
  </section>;
}
