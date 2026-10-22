import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SyntheticMonitoring } from './SyntheticMonitoring.js';

describe('SyntheticMonitoring', () => {
  it('labels fresh, stale and unavailable readings and preserves their units and timestamps', () => {
    render(<SyntheticMonitoring />);

    expect(screen.getByRole('heading', { name: 'Monitoramento por região' })).toBeDefined();
    expect(screen.getByText('Atualizada há 4 minutos')).toBeDefined();
    expect(screen.getByText('Último exemplo há 14 minutos')).toBeDefined();
    expect(screen.getAllByText('Falha simulada')).toHaveLength(2);
    expect(screen.getByText('1,82 m')).toBeDefined();
    expect(screen.getByText('46 mm')).toBeDefined();
    expect(screen.getByRole('img', { name: /Série sintética de precipitação/ })).toBeDefined();
    expect(screen.getByText(/Falhas de fonte não criam valores substitutos/)).toBeDefined();
  });
});
