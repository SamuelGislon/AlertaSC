import { useMemo } from 'react';

export interface PublicAlert {
  id: string;
  title: string;
  summary: string;
  status: string;
  generatedAt: string;
  expiresAt: string;
  synthetic: boolean;
}

interface PublicDashboardProps {
  alerts?: PublicAlert[];
  now?: number;
  state?: 'ready' | 'loading' | 'error';
  onNavigate: (destination: 'citizen' | 'feedback' | 'login') => void;
}

const sampleAlerts: PublicAlert[] = [{
  id: 'public-alert-synthetic-01',
  title: 'Exemplo de aviso de chuva intensa',
  summary: 'Conteúdo sintético para apresentar a composição de um comunicado público. Nenhum risco atual foi confirmado.',
  status: 'APPROVED',
  generatedAt: new Date(Date.now() - 15 * 60_000).toISOString(),
  expiresAt: new Date(Date.now() + 23 * 60 * 60_000 + 45 * 60_000).toISOString(),
  synthetic: true,
}];

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function PublicDashboard({ alerts = sampleAlerts, now = Date.now(), state = 'ready', onNavigate }: PublicDashboardProps) {
  const visibleAlerts = useMemo(() => alerts.filter((alert) => alert.synthetic && alert.status === 'APPROVED'
    && Number.isFinite(Date.parse(alert.expiresAt)) && Date.parse(alert.expiresAt) > now), [alerts, now]);

  return <div className="screen-stack">
    <section className="hero-panel" aria-labelledby="public-dashboard-title">
      <div className="hero-copy">
        <p className="eyebrow">Painel municipal · ambiente de demonstração</p>
        <h1 id="public-dashboard-title">Acompanhe as condições em Presidente Getúlio</h1>
        <p>Informações de monitoramento e avisos públicos em um só lugar.</p>
        <div className="hero-actions">
          <button type="button" className="button button-white" onClick={() => onNavigate('feedback')}>Como este aviso ajudou?</button>
          <button type="button" className="button button-outline" onClick={() => onNavigate('citizen')}>Preferências de avisos</button>
        </div>
      </div>
      <div className="hero-mark" aria-hidden="true">≋</div>
    </section>

    <div className="notice notice-warn" role="note">
      <span className="notice-icon" aria-hidden="true">i</span>
      <div><strong>Ambiente de demonstração</strong><p>Todos os valores abaixo são fictícios e não representam uma condição meteorológica observada.</p></div>
    </div>

    {state === 'loading' && <p className="notice notice-info" role="status">Carregando condições sintéticas…</p>}
    {state === 'error' && <p className="notice notice-error" role="alert">Não foi possível carregar as condições sintéticas. Tente novamente mais tarde.</p>}

    {state === 'ready' && <>
      <section className="metric-grid" aria-label="Condições sintéticas atuais">
        <article className="metric-card"><div className="metric-top"><span>Chuva acumulada</span><span aria-hidden="true">≋</span></div><p className="metric-value">46 mm</p><p className="metric-foot">Exemplo sintético · últimas 6 horas</p></article>
        <article className="metric-card"><div className="metric-top"><span>Rio Índios</span><span aria-hidden="true">∿</span></div><p className="metric-value">1,82 m</p><p className="metric-foot">Leitura de demonstração · 15h20</p></article>
        <article className="metric-card"><div className="metric-top"><span>Previsão de chuva</span><span aria-hidden="true">◷</span></div><p className="metric-value">20 mm</p><p className="metric-foot">Próximas 6 horas · sintética</p></article>
        <article className="metric-card"><div className="metric-top"><span>Vento</span><span aria-hidden="true">↗</span></div><p className="metric-value">24 km/h</p><p className="metric-foot">Exemplo sintético · 15h20</p></article>
      </section>

      <div className="content-grid content-grid-2">
        <section className="surface-card card-padding">
          <div className="section-heading"><div><h2>Condições recentes</h2><p>Série fictícia para demonstrar a leitura do painel</p></div><span className="status-chip status-warn">SINTÉTICO</span></div>
          <figure className="chart" role="img" aria-label="Gráfico sintético de precipitação nas últimas seis horas">
            <svg viewBox="0 0 720 220" aria-hidden="true" preserveAspectRatio="none">
              <g fill="none" stroke="var(--line)" strokeWidth="1"><path d="M50 25H700M50 70H700M50 115H700M50 160H700" /></g>
              <g fill="var(--muted)" fontSize="11"><text x="7" y="29">60 mm</text><text x="14" y="74">40 mm</text><text x="14" y="119">20 mm</text><text x="24" y="164">0</text><text x="50" y="195">09h</text><text x="170" y="195">11h</text><text x="290" y="195">13h</text><text x="410" y="195">15h</text><text x="530" y="195">17h</text><text x="650" y="195">19h</text></g>
              <path d="M50 140 C95 130 112 136 160 116 S225 96 270 110 S330 130 375 88 S445 56 490 76 S555 100 600 58 S650 45 700 51 L700 160 L50 160Z" fill="var(--chart-fill)" />
              <path d="M50 140 C95 130 112 136 160 116 S225 96 270 110 S330 130 375 88 S445 56 490 76 S555 100 600 58 S650 45 700 51" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </figure>
          <p className="caption">Fonte demonstrativa · valores sem conexão a órgão público.</p>
        </section>

        <section className="surface-card card-padding" aria-labelledby="public-alerts-heading">
          <div className="section-heading"><div><h2 id="public-alerts-heading">Avisos públicos</h2><p>Somente comunicados sintéticos aprovados e válidos</p></div><span className="status-chip status-info">{visibleAlerts.length} {visibleAlerts.length === 1 ? 'aviso' : 'avisos'}</span></div>
          {visibleAlerts.length === 0 ? <p className="empty-state">Sem aviso público válido no momento.</p> : <ul className="alert-list">
            {visibleAlerts.map((alert) => <li className="public-alert-card" key={alert.id}>
              <div className="alert-card-top"><span className="status-chip status-warn">Demonstração</span><span className="caption">Hoje · {formatTime(alert.generatedAt)}</span></div>
              <h3>{alert.title}</h3><p>{alert.summary}</p>
              <button type="button" className="button button-outline" onClick={() => onNavigate('feedback')}>Ver aviso e enviar retorno</button>
            </li>)}
          </ul>}
          <button type="button" className="button button-quiet public-login-link" onClick={() => onNavigate('login')}>Acesso do operador <span aria-hidden="true">→</span></button>
        </section>
      </div>
    </>}
  </div>;
}
