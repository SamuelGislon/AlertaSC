import { Activity, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';

interface AuditOverviewProps {
  onNavigate: (destination: 'alerts') => void;
}

export function AuditOverview({ onNavigate }: AuditOverviewProps) {
  return <div className="screen-stack">
    <div className="page-heading"><div><p className="eyebrow">Rastreabilidade</p><h1>Histórico e auditoria</h1><p className="lead">Ações de cada alerta são consultadas junto ao item correspondente, com histórico preservado após a expiração.</p></div></div>
    <Alert className="notice notice-info" role="note"><Activity className="notice-icon" aria-hidden="true" /><div><AlertTitle>Consulta por alerta</AlertTitle><AlertDescription>Nesta versão, não há uma listagem global disponível. Abra a fila autorizada e consulte o histórico de auditoria em cada alerta.</AlertDescription></div></Alert>
    <Card className="surface-card card-padding audit-summary">
      <div className="audit-icon" aria-hidden="true"><CircleCheck size={24} /></div><div><h2>Histórico preservado</h2><p>Os eventos vinculados a cada alerta permanecem disponíveis mesmo depois que o alerta expira. A tela não apresenta credenciais nem dados pessoais.</p></div>
      <Button type="button" className="button button-primary" onClick={() => onNavigate('alerts')}>Abrir fila de alertas</Button>
    </Card>
  </div>;
}
