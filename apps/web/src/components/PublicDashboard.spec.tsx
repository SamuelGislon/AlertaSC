import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PublicDashboard, type PublicAlert } from './PublicDashboard.js';

const alert = (overrides: Partial<PublicAlert> = {}): PublicAlert => ({
  id: 'approved-synthetic',
  title: 'Exemplo aprovado de chuva intensa',
  summary: 'Comunicado sintético aprovado para demonstração.',
  status: 'APPROVED',
  generatedAt: '2026-10-22T12:00:00.000Z',
  expiresAt: '2026-10-23T12:00:00.000Z',
  synthetic: true,
  ...overrides,
});

describe('PublicDashboard', () => {
  it('shows synthetic local conditions and an explicit warning that values are not official observations', () => {
    render(<PublicDashboard alerts={[]} now={Date.parse('2026-10-22T13:00:00.000Z')} onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /Acompanhe as condições em Presidente Getúlio/ })).toBeDefined();
    expect(screen.getByText(/valores abaixo são fictícios e não representam uma condição meteorológica observada/)).toBeDefined();
    expect(screen.getByText('46 mm')).toBeDefined();
    expect(screen.getByText('1,82 m')).toBeDefined();
    expect(screen.getByText('Sem aviso público válido no momento.')).toBeDefined();
  });

  it('lists only approved, synthetic and unexpired public alerts', () => {
    render(<PublicDashboard alerts={[
      alert(),
      alert({ id: 'candidate', title: 'Candidato administrativo', status: 'AWAITING_TRIAGE' }),
      alert({ id: 'expired', title: 'Aviso vencido', expiresAt: '2026-10-22T12:59:59.000Z' }),
      alert({ id: 'real', title: 'Dado não sintético', synthetic: false }),
    ]} now={Date.parse('2026-10-22T13:00:00.000Z')} onNavigate={vi.fn()} />);

    expect(screen.getByText('Exemplo aprovado de chuva intensa')).toBeDefined();
    expect(screen.queryByText('Candidato administrativo')).toBeNull();
    expect(screen.queryByText('Aviso vencido')).toBeNull();
    expect(screen.queryByText('Dado não sintético')).toBeNull();
  });

  it('offers citizen preferences, feedback and operator login navigation', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<PublicDashboard alerts={[alert()]} now={Date.parse('2026-10-22T13:00:00.000Z')} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: 'Preferências de avisos' }));
    expect(onNavigate).toHaveBeenCalledWith('citizen');
    await user.click(screen.getByRole('button', { name: 'Acesso do operador' }));
    expect(onNavigate).toHaveBeenCalledWith('login');
    await user.click(screen.getByRole('button', { name: /Como este aviso ajudou/ }));
    expect(onNavigate).toHaveBeenCalledWith('feedback');
  });

  it('renders loading and failure states without inventing measurements', () => {
    const { rerender } = render(<PublicDashboard alerts={[]} state="loading" onNavigate={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('Carregando condições sintéticas');
    expect(screen.queryByText('46 mm')).toBeNull();

    rerender(<PublicDashboard alerts={[]} state="error" onNavigate={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar');
    expect(screen.queryByText('46 mm')).toBeNull();
  });
});
