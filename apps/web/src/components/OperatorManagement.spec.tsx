import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api.js';
import { OperatorManagement } from './OperatorManagement.js';

vi.mock('../api.js', () => ({
  api: {
    operators: vi.fn(),
    createOperatorFixture: vi.fn(),
    disableOperator: vi.fn(),
  },
}));

describe('OperatorManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.operators).mockResolvedValue([]);
    vi.mocked(api.createOperatorFixture).mockResolvedValue({
      id: 'operator-synthetic-1',
      synthetic: true,
      active: true,
      roles: ['OPERATOR'],
      oneTimeCredentials: { cpf: '00000000000', password: 'synthetic-once' },
    });
  });

  it('creates a synthetic operator and shows credentials only in the one-time result', async () => {
    const user = userEvent.setup();
    render(<OperatorManagement />);

    expect(screen.getByText(/somente contas sintéticas/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Provisionar operador sintético' }));
    await waitFor(() => expect(api.createOperatorFixture).toHaveBeenCalledWith('operator-pg-01'));
    expect(await screen.findByText('Credenciais exibidas uma única vez')).toBeDefined();
    expect(screen.getByText('00000000000')).toBeDefined();
    expect(screen.getByText('synthetic-once')).toBeDefined();
    expect(screen.getByText(/operator-synthetic-1/)).toBeDefined();
  });

  it('refreshes the synthetic operator list after disabling an account', async () => {
    const user = userEvent.setup();
    vi.mocked(api.operators).mockResolvedValue([{
      id: 'operator-synthetic-2', synthetic: true, active: true, roles: ['OPERATOR'],
    }]);
    render(<OperatorManagement />);

    expect(await screen.findByText('operator-synthetic-2')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Desativar operador' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar desativação' }));
    await waitFor(() => expect(api.disableOperator).toHaveBeenCalledWith('operator-synthetic-2'));
    expect(api.operators).toHaveBeenCalledTimes(2);
  });
});
