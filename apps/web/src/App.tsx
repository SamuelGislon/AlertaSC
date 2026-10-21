import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { AlertBoard } from './components/AlertBoard.js';
import { LoginForm } from './components/LoginForm.js';
import { SyntheticCitizens } from './components/SyntheticCitizens.js';
import { CitizenPortal } from './components/CitizenPortal.js';
import { api, currentAccessToken, type AlertView, type OperatorSession, setAccessToken } from './api.js';

type Page = 'alerts' | 'citizens';

export function App() {
  const [operator, setOperator] = useState<OperatorSession | null>(null);
  const [page, setPage] = useState<Page>('alerts');
  const [citizenPortal, setCitizenPortal] = useState(false);
  const [alerts, setAlerts] = useState<AlertView[]>([]);
  const [lockGranted, setLockGranted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  const logout = useCallback(async () => {
    await api.logout();
    setOperator(null);
    setLockGranted(false);
    setAlerts([]);
  }, []);

  const signIn = useCallback(async ({ cpf, password }: { cpf: string; password: string }) => {
    try {
      const session = await api.login(cpf, password);
      setOperator(session);
      setAuthError(null);
    } catch {
      setAuthError('Credenciais inválidas.');
    }
  }, []);

  useEffect(() => {
    if (operator) return;
    void api.refresh().then(async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/me`, {
        credentials: 'include', headers: { Authorization: `Bearer ${currentAccessToken()}` },
      });
      if (!response.ok) return;
      const identity = await response.json() as OperatorSession;
      setOperator(identity);
    }).catch(() => setAccessToken(null));
  }, [operator]);

  useEffect(() => {
    if (!operator || page !== 'alerts') {
      setLockGranted(false);
      setAlerts([]);
      return;
    }
    let active = true;
    let socket: Socket | null = null;
    void api.acquireAlertTab().then(async () => {
      if (!active) return;
      setLockGranted(true);
      setLockError(null);
      setAlerts(await api.alerts());
      const token = currentAccessToken();
      if (!token) return;
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      socket = io(`${base}/alert-tab`, { auth: { token }, withCredentials: true });
      socket.on('disconnect', () => { if (active) setLockGranted(false); });
      socket.on('connect_error', () => { if (active) setLockGranted(false); });
    }).catch((error: Error) => {
      if (active) { setLockGranted(false); setLockError(error.message); }
    });
    return () => {
      active = false;
      socket?.disconnect();
      void api.releaseAlertTab().catch(() => undefined);
    };
  }, [operator, page]);

  if (!operator && citizenPortal) return <CitizenPortal onBackToLogin={() => setCitizenPortal(false)} />;

  if (!operator) return <main className="grid min-h-screen place-items-center p-4">
    <div className="w-full max-w-md">
      <p className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        Ambiente local com dados sintéticos. Não use dados reais de cidadãos.
      </p>
      <LoginForm onSubmit={signIn} error={authError} />
      <button onClick={() => setCitizenPortal(true)} className="mt-4 w-full text-sm text-sky-900 underline">Portal do cidadão (demonstração sintética)</button>
    </div>
  </main>;

  return <main className="min-h-screen">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div><p className="text-lg font-bold">AlertaSC</p><p className="text-xs text-slate-500">Presidente Getúlio/SC · ambiente sintético</p></div>
        <nav className="flex items-center gap-2" aria-label="Navegação principal">
          <button onClick={() => setPage('alerts')} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Alertas</button>
          {operator.roles.includes('ADMIN') && <button onClick={() => setPage('citizens')} className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100">Cadastros sintéticos</button>}
          <button onClick={() => void logout()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Sair</button>
        </nav>
      </div>
    </header>
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      {page === 'alerts' ? <>
        {lockError && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4">{lockError}</p>}
        <AlertBoard lockGranted={lockGranted} alerts={alerts} />
      </> : <SyntheticCitizens />}
    </div>
  </main>;
}
