import { BellRing, ChartNoAxesCombined, CircleCheck, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';

interface OperatorOverviewProps {
  onNavigate: (destination: 'monitoring' | 'alerts' | 'audit') => void;
}

export function OperatorOverview({ onNavigate }: OperatorOverviewProps) {
  return <div className="screen-stack">
    <div className="page-heading">
      <div><p className="eyebrow">Área de operação</p><h1>Visão geral operacional</h1><p className="lead">Resumo do monitoramento municipal.</p></div>
      <Button type="button" className="button button-primary" onClick={() => onNavigate('alerts')}>Abrir fila de alertas</Button>
    </div>
    <section className="metric-grid" aria-label="Resumo do monitoramento">
      <Card className="metric-card"><div className="metric-top"><span>Fontes monitoradas</span><span aria-hidden="true"><ChartNoAxesCombined size={18} /></span></div><p className="metric-value">3</p><p className="metric-foot">Uma leitura desatualizada</p></Card>
      <Card className="metric-card"><div className="metric-top"><span>Na fila</span><span aria-hidden="true"><BellRing size={18} /></span></div><p className="metric-value">2</p><p className="metric-foot">Aguardando triagem · exemplo</p></Card>
      <Card className="metric-card"><div className="metric-top"><span>Em análise</span><span aria-hidden="true"><Clock size={18} /></span></div><p className="metric-value">1</p><p className="metric-foot">Operador responsável</p></Card>
      <Card className="metric-card"><div className="metric-top"><span>Avisos públicos</span><span aria-hidden="true"><CircleCheck size={18} /></span></div><p className="metric-value">1</p><p className="metric-foot">Aprovado</p></Card>
    </section>
    <div className="content-grid content-grid-2">
      <Card className="surface-card card-padding">
        <div className="section-heading"><div><h2>Estado do monitoramento</h2><p>Resumo por fonte</p></div><Button type="button" variant="ghost" className="button button-quiet" onClick={() => onNavigate('monitoring')}>Ver monitoramento</Button></div>
        <ul className="data-list">
          <li className="data-row"><span className="source-indicator source-fresh" aria-hidden="true" /><div className="row-copy"><strong>Estação demonstrativa — Rio Índios</strong><p>Atualizada há 4 minutos</p></div><Badge variant="secondary" className="status-chip status-good">Atual</Badge></li>
          <li className="data-row"><span className="source-indicator source-stale" aria-hidden="true" /><div className="row-copy"><strong>Simulador de chuva</strong><p>Último exemplo há 14 minutos</p></div><Badge variant="secondary" className="status-chip status-warn">Desatualizada</Badge></li>
        </ul>
      </Card>
      <Card className="surface-card card-padding">
        <div className="section-heading"><div><h2>Ações recentes</h2><p>Atividade recente do sistema</p></div><Button type="button" variant="ghost" className="button button-quiet" onClick={() => onNavigate('audit')}>Abrir auditoria</Button></div>
        <ol className="timeline-list">
          <li><strong>Alerta aguardando triagem</strong><span>Hoje às 15h21 · Sistema</span></li>
          <li><strong>Leitura recebida</strong><span>Hoje às 15h20 · Monitoramento</span></li>
          <li><strong>Operador entrou</strong><span>Hoje às 15h04 · Autenticação</span></li>
        </ol>
      </Card>
    </div>
  </div>;
}
