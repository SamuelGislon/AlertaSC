import { useEffect, useState } from 'react';
import { Activity, CircleCheck, EyeOff, Trash, UserRoundPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.js';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog.js';
import { Badge } from '@/components/ui/badge.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { notifySuccess } from '@/components/ui/toast.js';
import { api, type NewSyntheticOperator, type SyntheticOperator } from '../api.js';

export function OperatorManagement() {
  const [operators, setOperators] = useState<SyntheticOperator[]>([]);
  const [credentials, setCredentials] = useState<NewSyntheticOperator | null>(null);
  const [pendingDisable, setPendingDisable] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function reload() {
    setOperators(await api.operators());
  }

  useEffect(() => { void reload().catch(() => setMessage('Não foi possível carregar os operadores.')); }, []);

  async function create() {
    setLoading(true);
    setMessage('');
    setCredentials(null);
    try {
      const created = await api.createOperatorFixture('operator-pg-01');
      setCredentials(created);
      await reload();
      setMessage('Operador provisionado. Guarde as credenciais agora; elas não serão exibidas novamente.');
      notifySuccess('Operador provisionado');
    } catch {
      setMessage('Não foi possível provisionar o operador.');
    } finally {
      setLoading(false);
    }
  }

  async function disable(operatorId: string) {
    setLoading(true);
    setMessage('');
    try {
      await api.disableOperator(operatorId);
      setPendingDisable(null);
      setCredentials(null);
      await reload();
      setMessage('Operador desativado. As sessões ativas foram revogadas.');
      notifySuccess('Operador desativado');
    } catch {
      setMessage('Não foi possível desativar o operador.');
    } finally {
      setLoading(false);
    }
  }

  return <section className="space-y-4" aria-labelledby="operators-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 id="operators-title" className="text-2xl font-bold">Operadores</h1>
        <p className="text-sm text-slate-600">Provisionamento protegido por permissão administrativa.</p>
      </div>
      <Button disabled={loading} onClick={() => void create()} className="button button-primary"><UserRoundPlus size={16} aria-hidden="true" />
        Provisionar operador
      </Button>
    </div>

    {message && <Alert role="status" className={message.startsWith('Não foi') ? 'notice notice-error' : 'notice notice-success'}>
      {message.startsWith('Não foi') ? <Activity className="notice-icon" aria-hidden="true" /> : <CircleCheck className="notice-icon" aria-hidden="true" />}
      <AlertDescription>{message}</AlertDescription>
    </Alert>}
    {credentials && <Card role="region" className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4" aria-label="Credenciais temporárias do operador">
      <h2 className="font-semibold">Credenciais exibidas uma única vez</h2>
      <p className="text-sm">Guarde as credenciais em local seguro. Elas não serão exibidas novamente nem gravadas nos logs.</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">CPF</dt><dd><code>{credentials.oneTimeCredentials.cpf}</code></dd></div>
        <div><dt className="font-semibold">Senha temporária</dt><dd><code>{credentials.oneTimeCredentials.password}</code></dd></div>
      </dl>
      <p className="break-all text-xs text-slate-600">ID técnico: {credentials.id}</p>
      <Button variant="ghost" onClick={() => setCredentials(null)} className="button button-quiet"><EyeOff size={16} aria-hidden="true" />Ocultar credenciais</Button>
    </Card>}

    <ul className="space-y-2">
      {operators.map((operator) => <li key={operator.id}>
        <Card className="flex-row flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div>
            <p className="break-all font-medium">{operator.id}</p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600"><Badge variant="secondary">{operator.roles.join(', ')}</Badge><Badge variant="secondary" className={operator.active ? 'status-chip status-good' : 'status-chip status-error'}>{operator.active ? 'Ativo' : 'Desativado'}</Badge></p>
          </div>
          {operator.active && <AlertDialog open={pendingDisable === operator.id}
            onOpenChange={(open) => setPendingDisable(open ? operator.id : null)}>
            <AlertDialogTrigger render={<Button type="button" variant="outline" className="button button-danger" disabled={loading} />}>
              <Trash size={16} aria-hidden="true" />Desativar operador
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar operador?</AlertDialogTitle>
                <AlertDialogDescription>As sessões ativas deste operador serão revogadas.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" className="button button-danger" disabled={loading}
                  onClick={() => { setPendingDisable(null); void disable(operator.id); }}>
                  Confirmar desativação
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>}
        </Card>
      </li>)}
      {operators.length === 0 && <li><Card className="w-full p-4 text-sm text-slate-600">Nenhuma conta adicional foi provisionada.</Card></li>}
    </ul>
  </section>;
}
