import { Activity, BellRing, ChartNoAxesCombined, CircleCheck, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';

interface OperatorOverviewProps {
  onNavigate: (destination: 'monitoring' | 'alerts' | 'audit') => void;
}

export function OperatorOverview({ onNavigate }: OperatorOverviewProps) {
  return <div className="screen-stack">
    <div className="page-heading">
      <div><p className="eyebrow">Área de operação</p><h1>Visão geral operacional</h1><p className="lead">Resumo sintético do ambiente de monitoramento municipal.</p></div>
      <Button type="button" className="button button-primary" onClick={() => onNavigate('alerts')}>Abrir fila de alertas</Button>
    </div>
    <Alert className="notice notice-info" role="note"><Activity className="notice-icon" aria-hidden="true" /><div><AlertTitle>Dados de demonstração</AlertTitle><AlertDescription>Não há fonte oficial conectada. Os exemplos servem para demonstrar a navegação e a hierarquia das informações.</AlertDescription></div></Alert>
    <section className="metric-grid" aria-label="Resumo de dados sintéticos">
      <Card className="metric-card"><div className="metric-top"><span>Fontes em demonstração</span><span aria-hidden="true"><ChartNoAxesCombined size={18} /></span></div><p className="metric-value">3</p><p className="metric-foot">Uma leitura sintética desatualizada</p></Card>
      <Card className="metric-card"><div className="metric-top"><span>Na fila</span><span aria-hidden="true"><BellRing size={18} /></span></div><p className="metric-value">2</p><p className="metric-foot">Aguardando triagem · exemplo</p></Card>
      <Card className="metric-card"><div className="metric-top"><span>Em análise</span><span aria-hidden="true"><Clock size={18} /></span></div><p className="metric-value">1</p><p className="metric-foot">Operador sintético</p></Card>
      <Card className="metric-card"><div className="metric-top"><span>Avisos públicos</span><span aria-hidden="true"><CircleCheck size={18} /></span></div><p className="metric-value">1</p><p className="metric-foot">Aprovado · exemplo sintético</p></Card>
    </section>
    <div className="content-grid content-grid-2">
      <Card className="surface-card card-padding">
        <div className="section-heading"><div><h2>Estado do monitoramento</h2><p>Resumo por fonte sintética</p></div><Button type="button" variant="ghost" className="button button-quiet" onClick={() => onNavigate('monitoring')}>Ver monitoramento</Button></div>
        <ul className="data-list">
          <li className="data-row"><span className="source-indicator source-fresh" aria-hidden="true" /><div className="row-copy"><strong>Estação demonstrativa — Rio Índios</strong><p>Atualizada há 4 minutos</p></div><Badge variant="secondary" className="status-chip status-good">Atual</Badge></li>
          <li className="data-row"><span className="source-indicator source-stale" aria-hidden="true" /><div className="row-copy"><strong>Simulador de chuva</strong><p>Último exemplo há 14 minutos</p></div><Badge variant="secondary" className="status-chip status-warn">Desatualizada</Badge></li>
        </ul>
      </Card>
      <Card className="surface-card card-padding">
        <div className="section-heading"><div><h2>Ações recentes</h2><p>Eventos de demonstração sem dados pessoais</p></div><Button type="button" variant="ghost" className="button button-quiet" onClick={() => onNavigate('audit')}>Abrir auditoria</Button></div>
        <ol className="timeline-list">
          <li><strong>Alerta sintético aguardando triagem</strong><span>Hoje às 15h21 · Sistema de demonstração</span></li>
          <li><strong>Leitura de demonstração recebida</strong><span>Hoje às 15h20 · Fonte sintética</span></li>
          <li><strong>Operador sintético entrou</strong><span>Hoje às 15h04 · Autenticação de demonstração</span></li>
        </ol>
      </Card>
    </div>
  </div>;
}
