import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertBoard } from './AlertBoard.js';

describe('AlertBoard access state', () => {
  it('does not display alerts unless the server granted the exclusive tab lock', () => {
    render(<AlertBoard lockGranted={false} alerts={[]} />);
    expect(screen.getByRole('status').textContent).toContain('A aba de alertas não está liberada');
    expect(screen.queryByRole('heading', { name: 'Fila de alertas' })).toBeNull();
  });

  it('shows the review queue after the server grants the lock', () => {
    render(<AlertBoard lockGranted alerts={[]} />);
    expect(screen.getByRole('heading', { name: 'Fila de alertas' })).toBeDefined();
  });
});
