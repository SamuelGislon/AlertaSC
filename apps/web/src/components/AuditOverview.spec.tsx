import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuditOverview } from './AuditOverview.js';

describe('AuditOverview', () => {
  it('explains that audit entries are viewed from a locked alert and does not invent a global event feed', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<AuditOverview onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: 'Histórico e auditoria' })).toBeDefined();
    expect(screen.getByText(/não há uma listagem global disponível/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Abrir fila de alertas' }));
    expect(onNavigate).toHaveBeenCalledWith('alerts');
  });
});
