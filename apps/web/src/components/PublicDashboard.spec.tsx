import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PublicAlert } from '../lib/public-alert.js';
import { PublicDashboard } from './PublicDashboard.js';

const alert = (overrides: Partial<PublicAlert> = {}): PublicAlert => ({
  id: 'approved-synthetic',
  title: 'Atenção para cheias — Rio Índios',
  summary: 'Acompanhe as condições do Rio Índios e siga as orientações da Defesa Civil.',
  area: 'Rio Índios — Presidente Getúlio/SC',
  status: 'APPROVED',
  generatedAt: '2026-10-22T12:00:00.000Z',
  expiresAt: '2026-10-23T12:00:00.000Z',
  synthetic: true,
  relatedReadings: [{
    metric: 'Nível do Rio Índios',
    value: 4.5,
    unit: 'm',
    observedAt: '2026-10-22T11:55:00.000Z',
  }],
  ...overrides,
});

describe('PublicDashboard', () => {
  it('shows the public panel without repeating the synthetic label outside the site header', () => {
    render(<PublicDashboard alerts={[]} now={Date.parse('2026-10-22T13:00:00.000Z')} onNavigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /Acompanhe as condições em Presidente Getúlio/ })).toBeDefined();
    expect(screen.queryByText(/sintétic|demonstração|fictíci/i)).toBeNull();
    expect(screen.getByText('46 mm')).toBeDefined();
    expect(screen.getByText('1,82 m')).toBeDefined();
    expect(screen.getByText('Sem aviso público válido no momento.')).toBeDefined();
    const metricIcons = document.querySelectorAll('.metric-top > span[aria-hidden="true"] svg');
    expect(metricIcons).toHaveLength(4);
    expect([...metricIcons].every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('lists only approved, synthetic and unexpired public alerts', () => {
    render(<PublicDashboard alerts={[
      alert(),
      alert({ id: 'candidate', title: 'Candidato administrativo', status: 'AWAITING_TRIAGE' }),
      alert({ id: 'expired', title: 'Aviso vencido', expiresAt: '2026-10-22T12:59:59.000Z' }),
      alert({ id: 'real', title: 'Dado não sintético', synthetic: false }),
    ]} now={Date.parse('2026-10-22T13:00:00.000Z')} onNavigate={vi.fn()} />);

    expect(screen.getByText('Atenção para cheias — Rio Índios')).toBeDefined();
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
    expect(screen.getByRole('status').textContent).toContain('Carregando condições');
    expect(screen.queryByText('46 mm')).toBeNull();

    rerender(<PublicDashboard alerts={[]} state="error" onNavigate={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar');
    expect(screen.queryByText('46 mm')).toBeNull();
  });

  it('shows one approved alert with its area, normalized reading, validity and return action in focused mode', async () => {
    const user = userEvent.setup();
    const onBackToOperator = vi.fn();
    const generatedAt = '2026-11-16T12:00:00.000Z';
    const expiresAt = '2026-11-17T12:00:00.000Z';
    render(<PublicDashboard
      alerts={[alert({ id: 'rio-indios', title: 'Atenção para cheias — Rio Índios', generatedAt, expiresAt })]}
      focusAlertId="rio-indios"
      now={Date.parse('2026-11-16T13:00:00.000Z')}
      onNavigate={vi.fn()}
      onBackToOperator={onBackToOperator}
    />);

    expect(screen.getByRole('heading', { name: 'Atenção para cheias — Rio Índios' })).toBeDefined();
    expect(screen.getByText('Rio Índios — Presidente Getúlio/SC')).toBeDefined();
    expect(screen.getByText('4,5 m')).toBeDefined();
    expect(screen.queryByText(/sintétic|demonstração|fictíci/i)).toBeNull();
    expect(screen.getByText(/Gerado em/).closest('time')?.getAttribute('datetime')).toBe(generatedAt);
    expect(screen.getByText(/Expira em/).closest('time')?.getAttribute('datetime')).toBe(expiresAt);
    expect(screen.queryByRole('region', { name: 'Condições atuais' })).toBeNull();
    expect(screen.queryByRole('img', { name: /Gráfico sintético de precipitação/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Voltar à fila' }));
    expect(onBackToOperator).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing', 'selected-alert-does-not-exist', [alert({ id: 'other-alert', title: 'Outro aviso aprovado' })]],
    ['unapproved', 'candidate', [alert({ id: 'candidate', status: 'AWAITING_TRIAGE' })]],
    ['expired', 'expired', [alert({ id: 'expired', expiresAt: '2026-11-16T13:00:00.000Z' })]],
  ])('shows an empty state for a %s focused alert without substituting another alert', (_caseName, focusAlertId, alerts) => {
    render(<PublicDashboard
      alerts={alerts}
      focusAlertId={focusAlertId}
      now={Date.parse('2026-11-16T13:00:00.000Z')}
      onNavigate={vi.fn()}
      onBackToOperator={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: 'Prévia indisponível' })).toBeDefined();
    expect(screen.getByText(/não está aprovado ou válido/)).toBeDefined();
    expect(screen.queryByText('Outro aviso aprovado')).toBeNull();
    expect(screen.queryByRole('region', { name: 'Condições atuais' })).toBeNull();
  });
});
