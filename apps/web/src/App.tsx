import { useCallback, useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api, currentAccessToken, type AlertView, type OperatorSession, setAccessToken } from './api.js';
import { AlertBoard } from './components/AlertBoard.js';
import { AppShell, type ShellNavigationItem } from './components/AppShell.js';
import { AuditOverview } from './components/AuditOverview.js';
import { CitizenFeedback } from './components/CitizenFeedback.js';
import { CitizenPortal } from './components/CitizenPortal.js';
import { LoginForm } from './components/LoginForm.js';
import { OperatorManagement } from './components/OperatorManagement.js';
import { OperatorOverview } from './components/OperatorOverview.js';
import { PublicDashboard } from './components/PublicDashboard.js';
import { SyntheticCitizens } from './components/SyntheticCitizens.js';
import { SyntheticMonitoring } from './components/SyntheticMonitoring.js';

type Page = 'public' | 'citizen' | 'feedback' | 'login' | 'overview' | 'monitoring' | 'alerts' | 'audit' | 'admin';

const publicNavigation: ShellNavigationItem[] = [
  { id: 'public', label: 'Início', icon: '⌂' },
  { id: 'citizen', label: 'Cadastro', icon: '○' },
  { id: 'feedback', label: 'Retorno', icon: '♡' },
  { id: 'login', label: 'Operador', icon: '◆' },
];

const operatorNavigation: ShellNavigationItem[] = [
  { id: 'overview', label: 'Resumo', icon: '⌂' },
  { id: 'monitoring', label: 'Monitoramento', icon: '▥' },
  { id: 'alerts', label: 'Alertas', icon: '!' },
  { id: 'audit', label: 'Auditoria', icon: '◷' },
];

export function App() {
  const [operator, setOperator] = useState<OperatorSession | null>(null);
  const [page, setPage] = useState<Page>('public');
  const [adminSection, setAdminSection] = useState<'operators' | 'citizens'>('operators');
  const [alerts, setAlerts] = useState<AlertView[]>([]);
  const [lockGranted, setLockGranted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockAttempt, setLockAttempt] = useState(0);

  const navigate = useCallback((destination: string) => {
    const allowed: Page[] = ['public', 'citizen', 'feedback', 'login', 'overview', 'monitoring', 'alerts', 'audit', 'admin'];
    if (allowed.includes(destination as Page)) setPage(destination as Page);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); }
    finally {
      setOperator(null);
      setLockGranted(false);
      setAlerts([]);
      setPage('public');
    }
  }, []);

  const recoverAlertLock = useCallback(async (reason: string) => {
    await api.recoverAlertTab(reason);
    setLockAttempt((attempt) => attempt + 1);
  }, []);

  const signIn = useCallback(async ({ cpf, password }: { cpf: string; password: string }) => {
    try {
      const session = await api.login(cpf, password);
      setOperator(session);
      setPage('alerts');
      setAuthError(null);
    } catch {
      setAuthError('Credenciais inválidas.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    void api.refresh().then(async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/me`, {
        credentials: 'include', headers: { Authorization: `Bearer ${currentAccessToken()}` },
      });
      if (!response.ok) return;
      const identity = await response.json() as OperatorSession;
      if (active) {
        setOperator(identity);
        setPage('alerts');
      }
    }).catch(() => setAccessToken(null));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!operator || page !== 'alerts') {
      setLockGranted(false);
      setAlerts([]);
      setLockError(null);
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
  }, [operator, page, lockAttempt]);

  if (!operator) {
    const citizenPage = page === 'citizen';
    const feedbackPage = page === 'feedback';
    const loginPage = page === 'login';
    const activePublicPage = citizenPage || feedbackPage || loginPage ? page : 'public';
    return <AppShell area={citizenPage || feedbackPage ? 'citizen' : 'public'} navigation={publicNavigation}
      activeItem={activePublicPage} onNavigate={navigate}>
      {citizenPage ? <CitizenPortal onBackToLogin={() => setPage('public')} />
        : feedbackPage ? <CitizenFeedback onNavigate={navigate} />
          : loginPage ? <div className="login-layout">
            <div className="notice notice-info"><span className="notice-icon" aria-hidden="true">i</span><div><strong>Conta autorizada</strong><p>Não há cadastro público de operadores. Entre somente com credenciais provisionadas para a equipe municipal.</p></div></div>
            <LoginForm onSubmit={signIn} error={authError} />
          </div>
            : <PublicDashboard onNavigate={navigate} />}
    </AppShell>;
  }

  const isAdmin = operator.roles.includes('ADMIN');
  const navigation = isAdmin
    ? [...operatorNavigation, { id: 'admin', label: 'Administração', icon: '○' }]
    : operatorNavigation;

  const operatorPage = page === 'admin'
    ? isAdmin ? <section className="screen-stack" aria-label="Administração sintética">
      <div role="tablist" aria-label="Cadastros sintéticos" className="admin-tabs">
        <button type="button" role="tab" aria-selected={adminSection === 'operators'} onClick={() => setAdminSection('operators')}>Operadores sintéticos</button>
        <button type="button" role="tab" aria-selected={adminSection === 'citizens'} onClick={() => setAdminSection('citizens')}>Cadastros sintéticos</button>
      </div>
      {adminSection === 'operators' ? <OperatorManagement /> : <SyntheticCitizens />}
    </section> : <section className="notice notice-error" role="alert"><strong>Acesso negado.</strong> Esta área exige a permissão administrativa validada pela API.</section>
    : page === 'overview' ? <OperatorOverview onNavigate={navigate} />
      : page === 'monitoring' ? <SyntheticMonitoring />
        : page === 'audit' ? <AuditOverview onNavigate={navigate} />
          : <AlertBoard lockGranted={lockGranted} alerts={alerts} lockError={lockError}
            canRecover={isAdmin} onRecover={recoverAlertLock}
            onClaim={async (alertId) => { await api.claimAlert(alertId); setAlerts(await api.alerts()); }}
            onTransition={async (alertId, status, reason) => {
              const result = await api.transitionAlert(alertId, status, reason);
              setAlerts(await api.alerts());
              return result.status;
            }}
            onLoadAudit={api.alertAudit}
            onSimulateDelivery={async (alertId) => api.simulateDelivery(alertId)} />;

  return <AppShell area="operator" navigation={navigation} activeItem={page === 'admin' ? 'admin' : page}
    onNavigate={navigate} onLogout={() => void logout()}>
    {operatorPage}
  </AppShell>;
}
