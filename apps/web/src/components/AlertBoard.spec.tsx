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
  relatedReadings: [],
};

const history: AuditEvent[] = [{
  id: 'event-1',
  actorId: null,
  action: 'ALERT_CREATED',
  occurredAt: '2026-10-21T12:00:00.000Z',
  previousState: null,
  newState: 'AWAITING_TRIAGE',
  reason: null,
  metadata: {},
}];

const callbacks = () => ({
  onClaim: vi.fn().mockResolvedValue(undefined),
  onTransition: vi.fn().mockResolvedValue('APPROVED'),
  onLoadAudit: vi.fn().mockResolvedValue(history),
  onSimulateDelivery: vi.fn().mockResolvedValue({
    eligibleCount: 1,
    message: 'Simulação concluída para 1 cidadão sintético. Nenhuma mensagem foi enviada.',
  }),
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

  it('shows related synthetic readings with their original and normalized units', () => {
    const alertWithReading = {
      ...alert,
      relatedReadings: [{
        source: 'Fixture local — estação fictícia PG-01',
        metric: 'Precipitação acumulada em 1 hora',
        rawValue: 5.2,
        rawUnit: 'cm',
        normalizedValue: 52,
        normalizedUnit: 'mm',
        observedAt: '2026-10-21T12:00:00.000Z',
        area: 'Presidente Getúlio/SC',
        synthetic: true as const,
      }],
    };
    render(<AlertBoard lockGranted alerts={[alertWithReading]} {...callbacks()} />);
    expect(screen.getByText('Leituras relacionadas (sintéticas)')).toBeDefined();
    expect(screen.getByText(/5.2 cm → 52 mm/)).toBeDefined();
    expect(screen.getByText(/Fixture local — estação fictícia PG-01/)).toBeDefined();
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
    actions.onLoadAudit.mockResolvedValue([
      {
        ...history[0]!, action: 'SYNTHETIC_SOURCE_DATA_RECEIVED',
        metadata: { synthetic: true, stage: 'raw', source: 'Fixture local', metric: 'Precipitação', value: 5.2, unit: 'cm' },
      },
    ]);
    render(<AlertBoard lockGranted alerts={[alert]} {...actions} />);

    await user.click(screen.getByRole('button', { name: 'Histórico da auditoria' }));
    await waitFor(() => expect(actions.onLoadAudit).toHaveBeenCalledWith(alert.id));
    expect(await screen.findByText('Dados sintéticos recebidos')).toBeDefined();
    expect(screen.getByText(/Precipitação · 5.2 cm/)).toBeDefined();
  });

  it('simulates a local delivery only for approved alerts and clearly confirms no message was sent', async () => {
    const user = userEvent.setup();
    const actions = callbacks();
    const approved = { ...alert, status: 'APPROVED' };
    render(<AlertBoard lockGranted alerts={[approved]} {...actions} />);

    await user.click(screen.getByRole('button', { name: 'Simular entrega local' }));
    await waitFor(() => expect(actions.onSimulateDelivery).toHaveBeenCalledWith(approved.id));
    expect(await screen.findByText(/Nenhuma mensagem foi enviada/)).toBeDefined();
  });

  it('offers PNG and JPEG downloads only for an approved, non-expired alert', async () => {
    const user = userEvent.setup();
    const onExportPoster = vi.fn().mockResolvedValue(undefined);
    const approved = { ...alert, status: 'APPROVED', expiresAt: '2099-10-22T12:00:00.000Z' };
    render(<AlertBoard lockGranted alerts={[approved]} {...callbacks()} onExportPoster={onExportPoster} />);

    await user.click(screen.getByText('Pré-visualizar arte do comunicado'));
    expect(screen.getByRole('img', { name: 'Prévia do comunicado sintético aprovado' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Baixar comunicado em PNG' }));
    await waitFor(() => expect(onExportPoster).toHaveBeenCalledWith(approved, 'png'));
    await user.click(screen.getByRole('button', { name: 'Baixar comunicado em JPEG' }));
    await waitFor(() => expect(onExportPoster).toHaveBeenCalledWith(approved, 'jpeg'));
  });

  it.each([
    ['Aguardando Triagem', 'AWAITING_TRIAGE'],
    ['Em Análise', 'IN_ANALYSIS'],
    ['Reprovado', 'REJECTED'],
    ['Expirado', 'EXPIRED'],
  ])('does not offer a poster download for %s alerts', (_label, status) => {
    const unavailable = { ...alert, status, expiresAt: '2099-10-22T12:00:00.000Z' };
    render(<AlertBoard lockGranted alerts={[unavailable]} {...callbacks()} />);
    expect(screen.queryByRole('button', { name: /Baixar comunicado em/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Compartilhar manualmente' })).toBeNull();
  });

  it('does not offer a poster download after its validity expires, even if its stored state is stale', () => {
    const staleApproval = { ...alert, status: 'APPROVED', expiresAt: '2020-10-22T12:00:00.000Z' };
    render(<AlertBoard lockGranted alerts={[staleApproval]} {...callbacks()} />);
    expect(screen.queryByRole('button', { name: /Baixar comunicado em/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Compartilhar manualmente' })).toBeNull();
  });

  it('offers manual sharing for an approved alert and leaves the final publish confirmation to the operator', async () => {
    const user = userEvent.setup();
    const onSharePoster = vi.fn().mockResolvedValue('shared');
    const approved = { ...alert, status: 'APPROVED', expiresAt: '2099-10-22T12:00:00.000Z' };
    render(<AlertBoard lockGranted alerts={[approved]} {...callbacks()} onSharePoster={onSharePoster} />);

    await user.click(screen.getByRole('button', { name: 'Compartilhar manualmente' }));

    await waitFor(() => expect(onSharePoster).toHaveBeenCalledWith(approved));
    expect(await screen.findByText(/revise o destino e confirme a publicação/)).toBeDefined();
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
