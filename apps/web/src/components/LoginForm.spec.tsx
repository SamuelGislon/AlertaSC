import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm.js';

describe('LoginForm', () => {
  it('submits CPF and password to the authentication flow', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '000.000.000-00' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'synthetic-only-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      cpf: '000.000.000-00',
      password: 'synthetic-only-password',
    }));
  });
});
