import { useState } from 'react';
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

  async function beginDemo() {
    if (!consentGiven) return;
    setLoading(true);
    try {
      const session = await api.createCitizenDemo('resident-pg-01');
      const preferences = await api.citizenMe(session.accessToken);
      setToken(session.accessToken);
      setProfile(preferences);
      setMessage('Perfil de demonstração criado. Ele contém somente dados sintéticos.');
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

  return <main className="grid min-h-screen place-items-center p-4">
    <section className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-sm" aria-labelledby="citizen-portal-title">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        Demonstração local: use somente dados sintéticos. O cadastro de pessoas reais está desativado até a validação institucional.
      </div>
      <div>
        <h1 id="citizen-portal-title" className="text-2xl font-bold">Portal do cidadão</h1>
        <p className="mt-1 text-sm text-slate-600">Presidente Getúlio/SC · ambiente de demonstração</p>
      </div>

      {!profile ? <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consentGiven} onChange={(event) => setConsentGiven(event.target.checked)} />
          <span>Concordo em criar um cadastro somente para esta demonstração sintética. Isso não ativa comunicações reais.</span>
        </label>
        <button disabled={loading || !consentGiven} onClick={() => void beginDemo()} className="rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white disabled:opacity-50">
          Iniciar cadastro de demonstração
        </button>
      </div> : <div className="space-y-4">
        <p className="text-sm">Cadastro sintético ativo. Consentimento de demonstração registrado.</p>
        <fieldset className="space-y-2">
          <legend className="font-semibold">Município</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={profile.municipalities.includes('4214001')} onChange={toggleMunicipality} />
            Presidente Getúlio/SC
          </label>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="font-semibold">Tipos de alerta</legend>
          {Object.entries(eventLabels).map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={profile.eventTypes.includes(value)} onChange={() => toggleEventType(value)} />
            {label}
          </label>)}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="font-semibold">Canal de demonstração</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={profile.channels.includes('telegram')} onChange={toggleTelegram} />
            Telegram sintético (sem envio real)
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button disabled={loading} onClick={() => void savePreferences()} className="rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white">Salvar preferências</button>
          <button disabled={loading} onClick={() => void removeRegistration()} className="rounded-lg border border-slate-300 px-4 py-2">Remover cadastro</button>
        </div>
      </div>}

      {message && <p role="status" className="text-sm">{message}</p>}
      <button onClick={onBackToLogin} className="text-sm text-sky-900 underline">Voltar ao acesso da Defesa Civil</button>
    </section>
  </main>;
}
