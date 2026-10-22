const readings = [
  { place: 'Rio Índios · centro', metric: 'Nível', value: '1,82 m', observed: '15h20', freshness: 'Atualizada há 4 minutos', status: 'Atual', tone: 'good' },
  { place: 'Chuva · estação demo', metric: 'Precipitação', value: '46 mm', observed: '15h06', freshness: 'Último exemplo há 14 minutos', status: 'Desatualizada', tone: 'warn' },
  { place: 'Vento · estação demo', metric: 'Velocidade', value: null, observed: null, freshness: 'Sem atualização disponível', status: 'Falha simulada', tone: 'error' },
] as const;

export function SyntheticMonitoring() {
  return <div className="screen-stack">
    <div className="page-heading"><div><p className="eyebrow">Observações sintéticas</p><h1>Monitoramento por região</h1><p className="lead">Leituras acima de 10 minutos são sinalizadas. Falhas de fonte não criam valores substitutos.</p></div><span className="status-chip status-warn">Simulador local</span></div>
    <div className="notice notice-info"><span className="notice-icon" aria-hidden="true">i</span><div><strong>Somente dados fictícios</strong><p>Leituras, horários e regiões são exemplos. Nenhuma fonte oficial está conectada.</p></div></div>
    <section className="source-grid" aria-label="Estado das fontes sintéticas">
      {readings.map((reading) => <article key={reading.place} className="surface-card source-card">
        <span className={`source-indicator source-${reading.tone}`} aria-hidden="true" />
        <div className="row-copy"><strong>{reading.place}</strong><p>{reading.metric}{reading.value ? ` · ${reading.value}` : ''}{reading.observed ? ` · às ${reading.observed}` : ''}</p></div>
        <span className={`status-chip status-${reading.tone}`}>{reading.status}</span>
        <p className="source-freshness">{reading.freshness}</p>
      </article>)}
    </section>
    <section className="surface-card card-padding">
      <div className="section-heading"><div><h2>Precipitação sintética</h2><p>Últimas 6 horas · milímetros · série de demonstração</p></div><span className="tag">Presidente Getúlio/SC</span></div>
      <figure className="chart" role="img" aria-label="Série sintética de precipitação por hora">
        <svg viewBox="0 0 720 220" aria-hidden="true" preserveAspectRatio="none">
          <g fill="none" stroke="var(--line)" strokeWidth="1"><path d="M50 25H700M50 70H700M50 115H700M50 160H700" /></g>
          <g fill="var(--muted)" fontSize="11"><text x="7" y="29">60 mm</text><text x="14" y="74">40 mm</text><text x="14" y="119">20 mm</text><text x="24" y="164">0</text><text x="50" y="195">09h</text><text x="290" y="195">13h</text><text x="530" y="195">17h</text><text x="650" y="195">19h</text></g>
          <path d="M50 140 C95 130 112 136 160 116 S225 96 270 110 S330 130 375 88 S445 56 490 76 S555 100 600 58 S650 45 700 51 L700 160 L50 160Z" fill="var(--chart-fill)" />
          <path d="M50 140 C95 130 112 136 160 116 S225 96 270 110 S330 130 375 88 S445 56 490 76 S555 100 600 58 S650 45 700 51" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </figure>
      <p className="caption">Série demonstrativa. Não representa precipitação observada.</p>
    </section>
    <section className="surface-card card-padding">
      <div className="section-heading"><div><h2>Leituras recentes</h2><p>Valor e hora de observação</p></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Variável</th><th>Região</th><th>Valor</th><th>Observado</th><th>Estado</th></tr></thead><tbody>
        <tr><td data-label="Variável">Nível do rio</td><td data-label="Região">Rio Índios · centro</td><td data-label="Valor">1,82 m</td><td data-label="Observado">15h20</td><td data-label="Estado"><span className="status-chip status-good">Atual</span></td></tr>
        <tr><td data-label="Variável">Precipitação acumulada</td><td data-label="Região">Estação demonstrativa</td><td data-label="Valor">46 mm</td><td data-label="Observado">15h06</td><td data-label="Estado"><span className="status-chip status-warn">Desatualizada</span></td></tr>
        <tr><td data-label="Variável">Vento</td><td data-label="Região">Estação demonstrativa</td><td data-label="Valor">—</td><td data-label="Observado">—</td><td data-label="Estado"><span className="status-chip status-error">Falha simulada</span></td></tr>
      </tbody></table></div>
    </section>
  </div>;
}
