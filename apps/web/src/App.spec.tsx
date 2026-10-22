import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.js';

const apiMocks = vi.hoisted(() => ({
  login: vi.fn(), refresh: vi.fn(), logout: vi.fn(), acquireAlertTab: vi.fn(), releaseAlertTab: vi.fn(), alerts: vi.fn(),
  claimAlert: vi.fn(), transitionAlert: vi.fn(), alertAudit: vi.fn(), simulateDelivery: vi.fn(), recoverAlertTab: vi.fn(),
  operators: vi.fn(), createOperatorFixture: vi.fn(), disableOperator: vi.fn(), citizens: vi.fn(), createCitizenFixture: vi.fn(),
  removeCitizen: vi.fn(), createCitizenDemo: vi.fn(), citizenMe: vi.fn(), updateCitizenPreferences: vi.fn(), removeCitizenSelf: vi.fn(),
  setAccessToken: vi.fn(), currentAccessToken: vi.fn(),
}));

vi.mock('./api.js', () => ({ api: apiMocks, setAccessToken: apiMocks.setAccessToken, currentAccessToken: apiMocks.currentAccessToken }));
vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({ on: vi.fn(), disconnect: vi.fn() })) }));

describe('AlertaSC application navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.refresh.mockRejectedValue(new Error('Sem sessão local'));
    apiMocks.login.mockResolvedValue({ id: 'operator-synthetic-01', roles: ['OPERATOR'] });
    apiMocks.acquireAlertTab.mockResolvedValue({ acquired: true });
    apiMocks.alerts.mockResolvedValue([]);
    apiMocks.releaseAlertTab.mockResolvedValue({ released: true });
  });

  it('opens on the public dashboard and keeps the restricted alert queue out of the visitor view', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Acompanhe as condições em Presidente Getúlio/ })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Fila de alertas' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeDefined();
  });

  it('lets a visitor open citizen preferences and return to the public dashboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Preferências de avisos' }));
    expect(await screen.findByRole('heading', { name: 'Portal do cidadão' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: /Voltar ao painel público/ }));
    expect(await screen.findByRole('heading', { name: /Acompanhe as condições em Presidente Getúlio/ })).toBeDefined();
  });

  it('opens the alert queue after operator authentication and still acquires the backend tab lock', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Acesso do operador' }));
    await user.type(screen.getByLabelText('CPF'), '00000000000');
    await user.type(screen.getByLabelText('Senha'), 'synthetic-password');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Fila de alertas' })).toBeDefined();
    await waitFor(() => expect(apiMocks.acquireAlertTab).toHaveBeenCalledOnce());
    expect(apiMocks.alerts).toHaveBeenCalledOnce();
  });
});
