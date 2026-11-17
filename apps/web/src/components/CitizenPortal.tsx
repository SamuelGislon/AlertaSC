import { useState } from 'react';
import { Activity, ArrowLeft, CircleCheck, Trash } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.js';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog.js';
import { Button } from '@/components/ui/button.js';
import { Card } from '@/components/ui/card.js';
import { Checkbox } from '@/components/ui/checkbox.js';
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field.js';
import { notifySuccess } from '@/components/ui/toast.js';
import { api, type CitizenPreferences } from '../api.js';

interface CitizenPortalProps {
  onBackToLogin: () => void;
}

const eventLabels: Record<string, string> = {
  chuva_intensa: 'Chuva intensa',
  inundacao: 'Inundação',
};

export function CitizenPortal({ onBackToLogin }: CitizenPortalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<CitizenPreferences | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);

  async function beginDemo() {
    if (!consentGiven) return;
    setLoading(true);
    try {
      const session = await api.createCitizenDemo('resident-pg-01');
      const preferences = await api.citizenMe(session.accessToken);
      setToken(session.accessToken);
      setProfile(preferences);
      setMessage('Perfil de demonstração criado. Ele contém somente dados API.');
      notifySuccess('Cadastro gerado por IA iniciado');
    } catch {
      setMessage('Não foi possível iniciar a demonstração.');
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!token || !profile) return;
    setLoading(true);
    try {
      setProfile(await api.updateCitizenPreferences(token, profile));
      setMessage('Preferências atualizadas.');
      notifySuccess('Preferências salvas');
    } catch {
      setMessage('Não foi possível atualizar as preferências.');
    } finally {
      setLoading(false);
    }
  }

  async function removeRegistration() {
    if (!token) return;
    setLoading(true);
    try {
      await api.removeCitizenSelf(token);
      setToken(null);
      setProfile(null);
      setConsentGiven(false);
      setMessage('Cadastro removido da base ativa.');
      notifySuccess('Cadastro removido');
    } catch {
      setMessage('Não foi possível remover o cadastro.');
    } finally {
      setLoading(false);
    }
  }

  function toggleEventType(eventType: string) {
    if (!profile) return;
    const selected = new Set(profile.eventTypes);
    if (selected.has(eventType)) selected.delete(eventType);
    else selected.add(eventType);
    setProfile({ ...profile, eventTypes: [...selected] });
  }

  function toggleMunicipality() {
    if (!profile) return;
    const municipalities = profile.municipalities.includes('4214001') ? [] : ['4214001'];
    setProfile({ ...profile, municipalities });
  }

  function toggleTelegram() {
    if (!profile) return;
    const channels = profile.channels.includes('telegram') ? [] : ['telegram'];
    setProfile({ ...profile, channels });
  }

  return <Card role="region" className="citizen-portal-card surface-card card-padding" aria-labelledby="citizen-portal-title">
    <Alert role="note" className="notice notice-warn">
      <Activity className="notice-icon" aria-hidden="true" />
      <div>
        <AlertTitle>Demonstração local</AlertTitle>
        <AlertDescription>Use somente dados API. O cadastro de pessoas reais está desativado até a validação institucional.</AlertDescription>
      </div>
    </Alert>
    <div>
      <h1 id="citizen-portal-title" className="text-2xl font-bold">Portal do cidadão</h1>
      <p className="mt-1 text-sm text-slate-600">Presidente Getúlio/SC · ambiente de demonstração</p>
    </div>

    {!profile ? <div className="space-y-3">
      <Field orientation="horizontal" className="items-start text-sm">
        <Checkbox id="citizen-demo-consent" checked={consentGiven} onCheckedChange={(checked) => setConsentGiven(checked === true)} />
        <FieldLabel htmlFor="citizen-demo-consent" className="items-start font-normal">
          Concordo em criar um cadastro somente para esta demonstração sintética. Isso não ativa comunicações reais.
        </FieldLabel>
      </Field>
      <Button disabled={loading || !consentGiven} onClick={() => void beginDemo()} className="button button-primary">
        Iniciar cadastro de demonstração
      </Button>
    </div> : <div className="space-y-4">
      <p className="text-sm">Cadastro gerado por IA ativo. Consentimento de demonstração registrado.</p>
      <FieldSet className="space-y-2">
        <FieldLegend variant="label">Município</FieldLegend>
        <Field orientation="horizontal" className="items-center text-sm">
          <Checkbox id="citizen-municipality" checked={profile.municipalities.includes('4214001')} onCheckedChange={toggleMunicipality} />
          <FieldLabel htmlFor="citizen-municipality" className="font-normal">Presidente Getúlio/SC</FieldLabel>
        </Field>
      </FieldSet>
      <FieldSet className="space-y-2">
        <FieldLegend variant="label">Tipos de alerta</FieldLegend>
        {Object.entries(eventLabels).map(([value, label]) => <Field key={value} orientation="horizontal" className="items-center text-sm">
          <Checkbox id={`citizen-event-${value}`} checked={profile.eventTypes.includes(value)} onCheckedChange={() => toggleEventType(value)} />
          <FieldLabel htmlFor={`citizen-event-${value}`} className="font-normal">{label}</FieldLabel>
        </Field>)}
      </FieldSet>
      <FieldSet className="space-y-2">
        <FieldLegend variant="label">Canal de demonstração</FieldLegend>
        <Field orientation="horizontal" className="items-center text-sm">
          <Checkbox id="citizen-telegram" checked={profile.channels.includes('telegram')} onCheckedChange={toggleTelegram} />
          <FieldLabel htmlFor="citizen-telegram" className="font-normal">Telegram gerado por IA (sem envio real)</FieldLabel>
        </Field>
      </FieldSet>
      <div className="flex flex-wrap gap-3">
        <Button disabled={loading} onClick={() => void savePreferences()} className="button button-primary">Salvar preferências</Button>
        <AlertDialog open={confirmRemoval} onOpenChange={setConfirmRemoval}>
          <AlertDialogTrigger render={<Button type="button" variant="destructive" className="button button-danger" disabled={loading} />}>
            <Trash size={16} aria-hidden="true" /> Remover cadastro
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover cadastro?</AlertDialogTitle>
              <AlertDialogDescription>O cadastro gerado por IA será removido da base ativa e deixará de ser elegível para futuros envios simulados.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" className="button button-danger" disabled={loading}
                onClick={() => { setConfirmRemoval(false); void removeRegistration(); }}>
                Confirmar remoção
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>}

    {message && <Alert role="status" className={message.startsWith('Não foi') ? 'notice notice-error' : 'notice notice-success'}>
      {message.startsWith('Não foi') ? <Activity className="notice-icon" aria-hidden="true" /> : <CircleCheck className="notice-icon" aria-hidden="true" />}
      <AlertDescription>{message}</AlertDescription>
    </Alert>}
    <Button type="button" variant="ghost" onClick={onBackToLogin} className="button button-quiet citizen-back-button">
      <ArrowLeft size={16} aria-hidden="true" />Voltar ao painel público
    </Button>
  </Card>;
}
