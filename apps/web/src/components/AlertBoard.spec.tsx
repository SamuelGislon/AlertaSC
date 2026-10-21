import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AlertView, AuditEvent } from '../api.js';
import { AlertBoard } from './AlertBoard.js';

const alert: AlertView = {
  id: 'alert-synthetic-1',
  title: 'Chuva sintética para teste',
  summary: 'Leitura fictícia usada para validar a revisão.',
  source: 'Fixture sintética',
  area: 'Presidente Getúlio/SC',
  status: 'AWAITING_TRIAGE',
  generatedAt: '2026-10-21T12:00:00.000Z',
  expiresAt: '2026-10-22T12:00:00.000Z',
  synthetic: true,
};

const history: AuditEvent[] = [{
  id: 'event-1',
  actorId: null,
  action: 'ALERT_CREATED',
  occurredAt: '2026-10-21T12:00:00.000Z',
  previousState: null,
  newState: 'AWAITING_TRIAGE',
  reason: null,
}];

const callbacks = () => ({
  onClaim: vi.fn().mockResolvedValue(undefined),
  onTransition: vi.fn().mockResolvedValue('APPROVED'),
  onLoadAudit: vi.fn().mockResolvedValue(history),
});

describe('AlertBoard review workflow', () => {
  it('does not display alerts unless the server granted the exclusive tab lock', () => {
    render(<AlertBoard lockGranted={false} alerts={[]} {...callbacks()} />);
    expect(screen.getByRole('status').textContent).toContain('A aba de alertas não está liberada');
    expect(screen.queryByRole('heading', { name: 'Fila de alertas' })).toBeNull();
  });

  it('shows the review queue, source, area and generation time after the server grants the lock', () => {
    render(<AlertBoard lockGranted alerts={[alert]} {...callbacks()} />);
    expect(screen.getByRole('heading', { name: 'Fila de alertas' })).toBeDefined();
    expect(screen.getByText('Fixture sintética')).toBeDefined();
    expect(screen.getByText(/Presidente Getúlio\/SC/)).toBeDefined();
    expect(screen.getByText(/Gerado em/)).toBeDefined();
    expect(screen.getByText(/Incerteza: conteúdo sintético/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Assumir alerta' })).toBeDefined();
  });

  it('requires an assigned operator claim and an explicit reason before approving', async () => {
    const user = userEvent.setup();
    const actions = callbacks();
    render(<AlertBoard lockGranted alerts={[alert]} {...actions} />);

    await user.click(screen.getByRole('button', { name: 'Assumir alerta' }));
    await waitFor(() => expect(actions.onClaim).toHaveBeenCalledWith(alert.id));
    expect(await screen.findByRole('button', { name: 'Aprovar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reprovar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled();

    await user.type(screen.getByLabelText('Motivo da decisão'), 'Revisão sintética concluída.');
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));
    await waitFor(() => expect(actions.onTransition).toHaveBeenCalledWith(alert.id, 'APPROVED', 'Revisão sintética concluída.'));
    expect(await screen.findByText('Aprovado')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Reprovar' })).toBeNull();
  });

  it('loads the immutable audit history for an alert on demand', async () => {
    const user = userEvent.setup();
    const actions = callbacks();
    render(<AlertBoard lockGranted alerts={[alert]} {...actions} />);

    await user.click(screen.getByRole('button', { name: 'Histórico da auditoria' }));
    await waitFor(() => expect(actions.onLoadAudit).toHaveBeenCalledWith(alert.id));
    expect(await screen.findByText('ALERT_CREATED')).toBeDefined();
    expect(screen.getByText('Aguardando Triagem')).toBeDefined();
  });

  it('allows only an administrator with an occupied-tab error to submit an audited recovery reason', async () => {
    const user = userEvent.setup();
    const onRecover = vi.fn().mockResolvedValue(undefined);
    render(<AlertBoard lockGranted={false} alerts={[]} lockError="A aba de alertas está em uso."
      canRecover onRecover={onRecover} {...callbacks()} />);

    expect(screen.getByRole('alert').textContent).toContain('está em uso');
    const recover = screen.getByRole('button', { name: 'Recuperar bloqueio' });
    expect(recover).toBeDisabled();
    await user.type(screen.getByLabelText('Justificativa para recuperação administrativa'), 'Sessão sintética órfã validada.');
    await user.click(recover);
    await waitFor(() => expect(onRecover).toHaveBeenCalledWith('Sessão sintética órfã validada.'));
  });
});
