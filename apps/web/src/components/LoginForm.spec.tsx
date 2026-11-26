import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm.js';

describe('LoginForm', () => {
  it('accepts an operator identifier and submits it with the password', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);

    expect(screen.getByRole('heading', { name: 'Entrar no Clima em Alerta' })).toBeDefined();
    const identifier = screen.getByLabelText('CPF ou identificador');
    expect(identifier.getAttribute('inputmode')).toBe('text');
    fireEvent.change(identifier, { target: { value: 'operador-demo' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'synthetic-only-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      cpf: 'operador-demo',
      password: 'synthetic-only-password',
    }));
  });
});
