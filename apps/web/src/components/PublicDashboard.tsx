import { useMemo } from 'react';
import { ArrowLeft, ArrowRight, CloudRain, CloudSun, TriangleAlert, WavesHorizontal, Wind } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Skeleton } from '@/components/ui/skeleton.js';
import { isEligiblePublicAlert, type PublicAlert } from '../lib/public-alert.js';

interface PublicDashboardProps {
  alerts?: PublicAlert[];
  now?: number;
  state?: 'ready' | 'loading' | 'error';
  focusAlertId?: string;
  onBackToOperator?: () => void;
  onNavigate: (destination: 'citizen' | 'feedback' | 'login') => void;
}

const sampleAlerts: PublicAlert[] = [{
  id: 'public-alert-synthetic-01',
  title: 'Atenção para cheias — Rio Índios',
  summary: 'Acompanhe as condições do Rio Índios e siga as orientações da Defesa Civil.',
  area: 'Rio Índios — Presidente Getúlio/SC',
  status: 'APPROVED',
  generatedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
  expiresAt: new Date(Date.now() + 23 * 60 * 60_000 + 45 * 60_000).toISOString(),
  synthetic: true,
  relatedReadings: [{ metric: 'Nível do Rio Índios', value: 1.82, unit: 'm', observedAt: new Date(Date.now() - 15 * 60_000).toISOString() }],
}];

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function formatMeasurement(value: number, unit: string): string {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

export function PublicDashboard({
  alerts = sampleAlerts,
  now = Date.now(),
  state = 'ready',
  focusAlertId,
  onBackToOperator,
  onNavigate,
}: PublicDashboardProps) {
  const visibleAlerts = useMemo(() => alerts.filter((alert) => isEligiblePublicAlert(alert, now)), [alerts, now]);
  const focusedAlert = focusAlertId === undefined
    ? undefined
    : visibleAlerts.find((alert) => alert.id === focusAlertId);

  if (focusAlertId !== undefined) {
    return <div className="screen-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Painel público · prévia do operador</p>
          <p className="mb-0 text-sm text-muted-foreground">Visualização do comunicado já aprovado.</p>
        </div>
        {onBackToOperator && <Button type="button" variant="outline" onClick={onBackToOperator}>
          <ArrowLeft aria-hidden="true" />Voltar à fila
        </Button>}
      </div>

      {state === 'loading' && <div className="grid gap-3" role="status" aria-label="Carregando prévia do alerta">
        <span className="sr-only">Carregando prévia do alerta…</span>
        <Skeleton className="h-52 rounded-3xl" aria-hidden="true" />
        <Skeleton className="h-28 rounded-2xl" aria-hidden="true" />
      </div>}
      {state === 'error' && <Alert variant="destructive" role="alert">
        <TriangleAlert aria-hidden="true" />
        <AlertDescription>Não foi possível carregar a prévia deste alerta.</AlertDescription>
      </Alert>}
      {state === 'ready' && !focusedAlert && <Card className="empty-state p-6" role="status">
        <h1 id="focused-alert-title" className="text-xl">Prévia indisponível</h1>
        <p className="mb-0">Este aviso não está aprovado ou válido para exibição. Volte à fila para selecionar outro alerta.</p>
      </Card>}
      {state === 'ready' && focusedAlert && <article className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-lg shadow-blue-950/5">
        <header className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 px-5 py-7 text-white sm:px-8 sm:py-9">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className="border border-white/30 bg-white/15 text-white">Aviso aprovado</Badge>
          </div>
          <h1 id="focused-alert-title" className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{focusedAlert.title}</h1>
          <p className="mb-0 max-w-3xl text-base leading-relaxed text-white/95 sm:text-lg">{focusedAlert.summary}</p>
        </header>

        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(240px,.7fr)]">
          <section className="grid content-start gap-4" aria-label="Detalhes do aviso">
            <div className="flex items-start gap-3 rounded-2xl bg-blue-50 p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><WavesHorizontal aria-hidden="true" /></span>
              <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Área</p><p className="mb-0 text-base font-bold text-slate-900">{focusedAlert.area}</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Geração</p>
                <time className="text-sm font-semibold text-slate-800" dateTime={focusedAlert.generatedAt}>Gerado em {formatDateTime(focusedAlert.generatedAt)}</time>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Validade</p>
                <time className="text-sm font-semibold text-slate-800" dateTime={focusedAlert.expiresAt}>Expira em {formatDateTime(focusedAlert.expiresAt)}</time>
              </div>
            </div>
          </section>

          <Card className="rounded-2xl border-slate-200 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div><h2 className="mb-1 text-base">Leituras relacionadas</h2><p className="mb-0 text-xs text-muted-foreground">Valores registrados para este aviso.</p></div>
              <WavesHorizontal className="text-blue-700" aria-hidden="true" />
            </div>
            {focusedAlert.relatedReadings.length === 0 ? <p className="empty-state mb-0">Nenhuma leitura associada.</p> : <ul className="grid gap-3 p-0">
              {focusedAlert.relatedReadings.map((reading, index) => <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3" key={`${reading.metric}-${reading.observedAt}-${index}`}>
                <div><p className="mb-1 text-sm font-semibold text-slate-800">{reading.metric}</p><time className="text-xs text-muted-foreground" dateTime={reading.observedAt}>Leitura · {formatTime(reading.observedAt)}</time></div>
                <strong className="shrink-0 text-xl font-extrabold text-blue-900">{formatMeasurement(reading.value, reading.unit)}</strong>
              </li>)}
            </ul>}
          </Card>
        </div>
      </article>}
    </div>;
  }

  return <div className="screen-stack">
    <section className="hero-panel" aria-labelledby="public-dashboard-title">
      <div className="hero-copy">
        <p className="eyebrow">Painel municipal</p>
        <h1 id="public-dashboard-title">Acompanhe as condições em Presidente Getúlio</h1>
        <p>Informações de monitoramento e avisos públicos em um só lugar.</p>
        <div className="hero-actions">
          <Button type="button" variant="secondary" className="button button-white" onClick={() => onNavigate('feedback')}>Como este aviso ajudou?</Button>
          <Button type="button" variant="outline" className="button button-outline" onClick={() => onNavigate('citizen')}>Preferências de avisos</Button>
        </div>
      </div>
      <div className="hero-mark" aria-hidden="true"><CloudRain size={68} strokeWidth={1.5} /></div>
    </section>

    {state === 'loading' && <div className="metric-grid" role="status" aria-label="Carregando condições">
      <span className="sr-only">Carregando condições…</span>
      {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="metric-card h-32" aria-hidden="true" />)}
    </div>}
    {state === 'error' && <Alert variant="destructive" className="notice notice-error" role="alert">
      <TriangleAlert className="notice-icon" aria-hidden="true" />
      <AlertDescription>Não foi possível carregar as condições. Tente novamente mais tarde.</AlertDescription>
    </Alert>}

    {state === 'ready' && <>
      <section className="metric-grid" aria-label="Condições atuais">
        <Card className="metric-card"><div className="metric-top"><span>Chuva acumulada</span><span aria-hidden="true"><CloudRain size={18} /></span></div><p className="metric-value">46 mm</p><p className="metric-foot">Últimas 6 horas</p></Card>
        <Card className="metric-card"><div className="metric-top"><span>Rio Índios</span><span aria-hidden="true"><WavesHorizontal size={18} /></span></div><p className="metric-value">1,82 m</p><p className="metric-foot">15h20</p></Card>
        <Card className="metric-card"><div className="metric-top"><span>Previsão de chuva</span><span aria-hidden="true"><CloudSun size={18} /></span></div><p className="metric-value">20 mm</p><p className="metric-foot">Próximas 6 horas</p></Card>
        <Card className="metric-card"><div className="metric-top"><span>Vento</span><span aria-hidden="true"><Wind size={18} /></span></div><p className="metric-value">24 km/h</p><p className="metric-foot">15h20</p></Card>
      </section>

      <div className="content-grid content-grid-2">
        <Card className="surface-card card-padding">
          <div className="section-heading"><div><h2>Condições recentes</h2><p>Precipitação nas últimas seis horas</p></div></div>
          <figure className="chart" role="img" aria-label="Gráfico de precipitação nas últimas seis horas">
            <svg viewBox="0 0 720 220" aria-hidden="true" preserveAspectRatio="none">
              <g fill="none" stroke="var(--line)" strokeWidth="1"><path d="M50 25H700M50 70H700M50 115H700M50 160H700" /></g>
              <g fill="var(--muted)" fontSize="11"><text x="7" y="29">60 mm</text><text x="14" y="74">40 mm</text><text x="14" y="119">20 mm</text><text x="24" y="164">0</text><text x="50" y="195">09h</text><text x="170" y="195">11h</text><text x="290" y="195">13h</text><text x="410" y="195">15h</text><text x="530" y="195">17h</text><text x="650" y="195">19h</text></g>
              <path d="M50 140 C95 130 112 136 160 116 S225 96 270 110 S330 130 375 88 S445 56 490 76 S555 100 600 58 S650 45 700 51 L700 160 L50 160Z" fill="var(--chart-fill)" />
              <path d="M50 140 C95 130 112 136 160 116 S225 96 270 110 S330 130 375 88 S445 56 490 76 S555 100 600 58 S650 45 700 51" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </figure>
        </Card>

        <Card className="surface-card card-padding" aria-labelledby="public-alerts-heading">
          <div className="section-heading"><div><h2 id="public-alerts-heading">Avisos públicos</h2><p>Comunicados aprovados e válidos</p></div><Badge variant="secondary" className="status-chip status-info">{visibleAlerts.length} {visibleAlerts.length === 1 ? 'aviso' : 'avisos'}</Badge></div>
          {visibleAlerts.length === 0 ? <p className="empty-state">Sem aviso público válido no momento.</p> : <ul className="alert-list">
            {visibleAlerts.map((alert) => <li className="public-alert-card" key={alert.id}>
              <div className="alert-card-top"><span className="caption">Hoje · {formatTime(alert.generatedAt)}</span></div>
              <h3>{alert.title}</h3><p>{alert.summary}</p>
              <Button type="button" variant="outline" className="button button-outline" onClick={() => onNavigate('feedback')}>Ver aviso e enviar retorno</Button>
            </li>)}
          </ul>}
          <Button type="button" variant="ghost" className="button button-quiet public-login-link" onClick={() => onNavigate('login')}>Acesso do operador <ArrowRight size={16} aria-hidden="true" /></Button>
        </Card>
      </div>
    </>}
  </div>;
}
