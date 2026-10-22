import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CitizenFeedback } from './CitizenFeedback.js';

describe('CitizenFeedback', () => {
  it('collects a synthetic usefulness response without requesting contact information or persisting it', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<CitizenFeedback onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: 'Este aviso foi útil?' })).toBeDefined();
    expect(screen.queryByLabelText(/nome|telefone|endereço|localização/i)).toBeNull();
    await user.selectOptions(screen.getByLabelText('Sua avaliação'), 'useful');
    await user.click(screen.getByRole('button', { name: 'Enviar retorno' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/Retorno sintético registrado/);
    expect(screen.getByText(/Nenhum dado foi enviado ou persistido/)).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Voltar ao painel' }));
    expect(onNavigate).toHaveBeenCalledWith('public');
  });

  it('requires a selection before submitting feedback', async () => {
    const user = userEvent.setup();
    render(<CitizenFeedback onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviar retorno' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Sua avaliação'), 'not-useful');
    expect(screen.getByRole('button', { name: 'Enviar retorno' })).toBeEnabled();
  });
});
