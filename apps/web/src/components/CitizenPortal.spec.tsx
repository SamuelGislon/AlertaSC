import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CitizenPortal } from './CitizenPortal.js';

const apiMocks = vi.hoisted(() => ({
  createCitizenDemo: vi.fn(),
  citizenMe: vi.fn(),
  updateCitizenPreferences: vi.fn(),
  removeCitizenSelf: vi.fn(),
}));

vi.mock('../api.js', () => ({ api: apiMocks }));

const preferences = {
  id: 'synthetic-person', synthetic: true as const, active: true, consent: true,
  consentedAt: '2026-10-21T12:00:00.000Z', municipalities: ['4214001'],
  eventTypes: ['chuva_intensa', 'inundacao'], channels: ['telegram'],
};

describe('CitizenPortal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts a synthetic demo, changes preferences and allows immediate opt-out', async () => {
    apiMocks.createCitizenDemo.mockResolvedValue({ id: 'synthetic-person', synthetic: true, accessToken: 'one-time-token' });
    apiMocks.citizenMe.mockResolvedValue(preferences);
    apiMocks.updateCitizenPreferences.mockImplementation(async (_token, value) => ({ ...preferences, ...value }));
    apiMocks.removeCitizenSelf.mockResolvedValue(undefined);

    render(<CitizenPortal onBackToLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Concordo em criar um cadastro somente para esta demonstração/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar cadastro de demonstração' }));

    await screen.findByText('Cadastro sintético ativo. Consentimento de demonstração registrado.');
    expect(apiMocks.createCitizenDemo).toHaveBeenCalledWith('resident-pg-01');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Inundação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }));
    await waitFor(() => expect(apiMocks.updateCitizenPreferences).toHaveBeenCalledWith(
      'one-time-token', expect.objectContaining({ eventTypes: ['chuva_intensa'] }),
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Remover cadastro' }));
    await screen.findByRole('button', { name: 'Iniciar cadastro de demonstração' });
    expect(apiMocks.removeCitizenSelf).toHaveBeenCalledWith('one-time-token');
  });
});
