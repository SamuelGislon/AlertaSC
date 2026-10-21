import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { expireDueAlerts, purgeExpiredDeletionMarkers } from '@alertasc/data';

@Injectable()
export class ExpirationService {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  expireDue(now = new Date()): Promise<number> {
    return expireDueAlerts(this.database, now);
  }

  purgeExpiredReconciliation(now = new Date()): Promise<number> {
    return purgeExpiredDeletionMarkers(this.database, now);
  }
}
