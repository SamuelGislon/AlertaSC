import { Cron, CronExpression } from '@nestjs/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { ExpirationService } from './expiration.service.js';

@Injectable()
export class ExpirationJob {
  constructor(@Inject(ExpirationService) private readonly expiration: Pick<ExpirationService, 'expireDue' | 'purgeExpiredReconciliation'>) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiration(): Promise<void> {
    const expired = await this.expiration.expireDue();
    if (expired > 0) process.stdout.write(JSON.stringify({ event: 'alert_expiration_run', count: expired }) + '\n');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDeletionReconciliationRetention(): Promise<void> {
    await this.expiration.purgeExpiredReconciliation();
  }
}
