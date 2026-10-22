interface AuditOverviewProps {
  onNavigate: (destination: 'alerts') => void;
}

export function AuditOverview({ onNavigate }: AuditOverviewProps) {
  return <div className="screen-stack">
    <div className="page-heading"><div><p className="eyebrow">Rastreabilidade</p><h1>Histórico e auditoria</h1><p className="lead">Ações de cada alerta são consultadas junto ao item correspondente, com histórico preservado após a expiração.</p></div></div>
    <div className="notice notice-info"><span className="notice-icon" aria-hidden="true">i</span><div><strong>Consulta por alerta</strong><p>Nesta versão, não há uma listagem global disponível. Abra a fila autorizada e consulte o histórico de auditoria em cada alerta.</p></div></div>
    <section className="surface-card card-padding audit-summary">
      <div className="audit-icon" aria-hidden="true">◷</div><div><h2>Histórico preservado</h2><p>Os eventos vinculados a cada alerta permanecem disponíveis mesmo depois que o alerta expira. A tela não apresenta credenciais nem dados pessoais.</p></div>
      <button type="button" className="button button-primary" onClick={() => onNavigate('alerts')}>Abrir fila de alertas</button>
    </section>
  </div>;
}
