import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button.js';
import { notifySuccess, ToastProvider } from '@/components/ui/toast.js';

function ToastTrigger() {
  return <Button onClick={() => notifySuccess('Preferências salvas', 'As alterações foram atualizadas.')}>Salvar</Button>;
}

describe('Base UI success toast', () => {
  it('announces a brief success without replacing the page-level status', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><ToastTrigger /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Preferências salvas')).toBeInTheDocument();
    expect(screen.getByText('As alterações foram atualizadas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar aviso' })).toBeInTheDocument();
  });
});
