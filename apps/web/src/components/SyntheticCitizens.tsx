import { useEffect, useState } from 'react';
import { Activity, CircleCheck, Trash, UserRoundPlus } from 'lucide-react';
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
import { api, type CitizenFixture } from '../api.js';

export function SyntheticCitizens() {
  const [citizens, setCitizens] = useState<CitizenFixture[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  async function reload() { setCitizens(await api.citizens()); }
  useEffect(() => { void reload(); }, []);

  async function create() {
    setLoading(true);
    try { await api.createCitizenFixture('resident-pg-01'); await reload(); setMessage('Cadastro gerado por IA criado.'); notifySuccess('Cadastro gerado por IA criado'); }
    catch { setMessage('Não foi possível criar o cadastro gerado por IA.'); }
    finally { setLoading(false); }
  }

  async function remove(id: string) {
    setLoading(true);
    try { await api.removeCitizen(id); await reload(); setMessage('Cadastro removido da base ativa.'); notifySuccess('Cadastro gerado por IA removido'); }
    catch { setMessage('Não foi possível remover o cadastro.'); }
    finally { setLoading(false); }
  }

  return <section className="space-y-4">
    <Alert role="note" className="notice notice-warn"><Activity className="notice-icon" aria-hidden="true" /><div>
      <AlertTitle>Ambiente de teste</AlertTitle><AlertDescription>Esta tela trabalha somente com cadastros API. Não informe dados de pessoas reais.</AlertDescription>
    </div></Alert>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Cadastros API</h1>
        <p className="text-sm text-slate-600">Preferências de teste para Presidente Getúlio/SC.</p>
      </div>
      <Button disabled={loading} onClick={() => void create()} className="button button-primary"><UserRoundPlus size={16} aria-hidden="true" />
        Criar cadastro fictício
      </Button>
    </div>
    {message && <Alert role="status" className={message.startsWith('Não foi') ? 'notice notice-error' : 'notice notice-success'}>
      {message.startsWith('Não foi') ? <Activity className="notice-icon" aria-hidden="true" /> : <CircleCheck className="notice-icon" aria-hidden="true" />}
      <AlertDescription>{message}</AlertDescription>
    </Alert>}
    <ul className="space-y-2">
      {citizens.map((citizen) => <li key={citizen.id}>
        <Card className="flex-row flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div><p className="font-medium">Morador gerado por IA</p><p className="text-xs text-slate-500">{citizen.active ? 'Consentimento gerado por IA ativo' : 'Sem consentimento ativo'} · Telegram</p></div>
          <AlertDialog open={pendingRemoval === citizen.id} onOpenChange={(open) => setPendingRemoval(open ? citizen.id : null)}>
            <AlertDialogTrigger render={<Button type="button" variant="destructive" className="button button-danger" disabled={loading} />}>
              <Trash size={16} aria-hidden="true" />Remover
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover cadastro gerado por IA?</AlertDialogTitle>
                <AlertDialogDescription>O cadastro deixará de ser elegível para futuras simulações e será removido da base ativa.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive" className="button button-danger" disabled={loading}
                  onClick={() => { setPendingRemoval(null); void remove(citizen.id); }}>
                  Confirmar remoção
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </li>)}
    </ul>
  </section>;
}
