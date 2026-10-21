import { useEffect, useState } from 'react';
import { api, type CitizenFixture } from '../api.js';

export function SyntheticCitizens() {
  const [citizens, setCitizens] = useState<CitizenFixture[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function reload() { setCitizens(await api.citizens()); }
  useEffect(() => { void reload(); }, []);

  async function create() {
    setLoading(true);
    try { await api.createCitizenFixture('resident-pg-01'); await reload(); setMessage('Cadastro sintético criado.'); }
    catch { setMessage('Não foi possível criar o cadastro sintético.'); }
    finally { setLoading(false); }
  }

  async function remove(id: string) {
    setLoading(true);
    try { await api.removeCitizen(id); await reload(); setMessage('Cadastro removido da base ativa.'); }
    catch { setMessage('Não foi possível remover o cadastro.'); }
    finally { setLoading(false); }
  }

  return <section className="space-y-4">
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      Ambiente de teste: esta tela trabalha somente com cadastros sintéticos. Não informe dados de pessoas reais.
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Cadastros sintéticos</h1>
        <p className="text-sm text-slate-600">Preferências de teste para Presidente Getúlio/SC.</p>
      </div>
      <button disabled={loading} onClick={() => void create()} className="rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white">
        Criar cadastro fictício
      </button>
    </div>
    {message && <p role="status" className="text-sm">{message}</p>}
    <ul className="space-y-2">
      {citizens.map((citizen) => <li key={citizen.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div><p className="font-medium">Morador sintético</p><p className="text-xs text-slate-500">{citizen.active ? 'Consentimento sintético ativo' : 'Sem consentimento ativo'} · Telegram</p></div>
        <button disabled={loading} onClick={() => void remove(citizen.id)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Remover</button>
      </li>)}
    </ul>
  </section>;
}
