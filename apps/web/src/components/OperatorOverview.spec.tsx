import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperatorOverview } from './OperatorOverview.js';

describe('OperatorOverview', () => {
  it('labels summary values as synthetic and links operators to monitoring, alerts and audit', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<OperatorOverview onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: 'Visão geral operacional' })).toBeDefined();
    expect(screen.getByText(/Não há fonte oficial conectada/)).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Abrir fila de alertas' }));
    expect(onNavigate).toHaveBeenCalledWith('alerts');
    await user.click(screen.getByRole('button', { name: 'Ver monitoramento' }));
    expect(onNavigate).toHaveBeenCalledWith('monitoring');
    await user.click(screen.getByRole('button', { name: 'Abrir auditoria' }));
    expect(onNavigate).toHaveBeenCalledWith('audit');
  });
});
