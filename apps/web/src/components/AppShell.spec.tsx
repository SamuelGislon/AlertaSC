import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell, type ShellNavigationItem } from './AppShell.js';

const navigation: ShellNavigationItem[] = [
  { id: 'public', label: 'Início', icon: '⌂' },
  { id: 'citizen', label: 'Cadastro', icon: '○' },
  { id: 'feedback', label: 'Retorno', icon: '♡' },
];

describe('AppShell', () => {
  it('keeps the AlertaSC brand and provides the same profile navigation in header and mobile bar', () => {
    render(<AppShell area="public" navigation={navigation} activeItem="public" onNavigate={vi.fn()}>
      <h1>Painel público</h1>
    </AppShell>);

    expect(screen.getByRole('link', { name: /AlertaSC/ })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Navegação móvel' })).toBeDefined();
    expect(screen.getAllByRole('button', { name: /Cadastro/ })).toHaveLength(2);
    expect(screen.getByText('Dados sintéticos')).toBeDefined();
    expect(screen.queryByText(/Defesa Civil|Prefeitura/)).toBeNull();
  });

  it('marks the current destination and sends navigation actions to the app shell', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<AppShell area="operator" navigation={navigation} activeItem="citizen" onNavigate={onNavigate}>
      <h1>Área de operação</h1>
    </AppShell>);

    expect(screen.getAllByRole('button', { name: /Cadastro/ }).every((button) => button.getAttribute('aria-current') === 'page')).toBe(true);
    await user.click(screen.getAllByRole('button', { name: /Retorno/ })[0]!);
    expect(onNavigate).toHaveBeenCalledWith('feedback');
    expect(screen.getByText('Área do operador')).toBeDefined();
  });

  it('shows a sign-out action only when supplied by an authenticated shell', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(<AppShell area="operator" navigation={navigation} activeItem="public" onNavigate={vi.fn()} onLogout={onLogout}>
      <h1>Área de operação</h1>
    </AppShell>);

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
