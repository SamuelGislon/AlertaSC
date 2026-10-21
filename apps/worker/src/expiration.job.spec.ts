import { describe, expect, it, vi } from 'vitest';
import { ExpirationJob } from './expiration.job.js';

describe('ExpirationJob', () => {
  it('runs the idempotent expiration service when the scheduled task fires', async () => {
    const expireDue = vi.fn().mockResolvedValue(3);
    const job = new ExpirationJob({ expireDue } as never);

    await job.handleExpiration();

    expect(expireDue).toHaveBeenCalledOnce();
  });
});
