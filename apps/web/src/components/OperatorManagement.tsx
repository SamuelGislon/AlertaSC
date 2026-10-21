import { useEffect, useState } from 'react';
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

  useEffect(() => { void reload().catch(() => setMessage('Não foi possível carregar os operadores sintéticos.')); }, []);

  async function create() {
    setLoading(true);
    setMessage('');
    setCredentials(null);
    try {
      const created = await api.createOperatorFixture('operator-pg-01');
      setCredentials(created);
      await reload();
      setMessage('Operador sintético provisionado. Guarde as credenciais agora; elas não serão exibidas novamente.');
    } catch {
      setMessage('Não foi possível provisionar o operador sintético.');
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
      setMessage('Operador sintético desativado. As sessões ativas foram revogadas.');
    } catch {
      setMessage('Não foi possível desativar o operador sintético.');
    } finally {
      setLoading(false);
    }
  }

  return <section className="space-y-4" aria-labelledby="operators-title">
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      Ambiente local: somente contas sintéticas. Não informe nem cadastre dados de operadores reais antes da validação institucional.
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 id="operators-title" className="text-2xl font-bold">Operadores sintéticos</h1>
        <p className="text-sm text-slate-600">Provisionamento local protegido por permissão administrativa.</p>
      </div>
      <button disabled={loading} onClick={() => void create()} className="rounded-lg bg-sky-800 px-4 py-2 font-semibold text-white disabled:opacity-50">
        Provisionar operador sintético
      </button>
    </div>

    {message && <p role="status" className="text-sm">{message}</p>}
    {credentials && <aside className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4" aria-label="Credenciais temporárias do operador">
      <h2 className="font-semibold">Credenciais exibidas uma única vez</h2>
      <p className="text-sm">Guarde em local seguro para esta demonstração sintética. Elas não são gravadas nos logs.</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">CPF sintético</dt><dd><code>{credentials.oneTimeCredentials.cpf}</code></dd></div>
        <div><dt className="font-semibold">Senha temporária</dt><dd><code>{credentials.oneTimeCredentials.password}</code></dd></div>
      </dl>
      <p className="break-all text-xs text-slate-600">ID técnico: {credentials.id}</p>
      <button onClick={() => setCredentials(null)} className="text-sm underline">Ocultar credenciais</button>
    </aside>}

    <ul className="space-y-2">
      {operators.map((operator) => <li key={operator.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <p className="break-all font-medium">{operator.id}</p>
          <p className="text-xs text-slate-600">{operator.roles.join(', ')} · {operator.active ? 'Ativo' : 'Desativado'} · Conta sintética</p>
        </div>
        {operator.active && pendingDisable !== operator.id && <button disabled={loading} onClick={() => setPendingDisable(operator.id)}
          className="rounded-lg border border-rose-700 px-3 py-1.5 text-sm text-rose-900">Desativar operador</button>}
        {operator.active && pendingDisable === operator.id && <div className="flex items-center gap-2">
          <span className="text-sm">Confirma a desativação?</span>
          <button disabled={loading} onClick={() => void disable(operator.id)} className="rounded-lg bg-rose-800 px-3 py-1.5 text-sm text-white">Confirmar desativação</button>
          <button disabled={loading} onClick={() => setPendingDisable(null)} className="rounded-lg border px-3 py-1.5 text-sm">Cancelar</button>
        </div>}
      </li>)}
      {operators.length === 0 && <li className="rounded-xl bg-white p-4 text-sm text-slate-600">Nenhuma conta sintética adicional foi provisionada.</li>}
    </ul>
  </section>;
}
