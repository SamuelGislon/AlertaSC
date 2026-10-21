import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(@Inject(DataSource) private readonly database: DataSource) {}

  @Get('health')
  health() { return { status: 'ok' }; }

  @Get('ready')
  async ready() {
    try {
      await this.database.query('SELECT 1');
      return { status: 'ready', database: 'ready' };
    } catch {
      throw new ServiceUnavailableException('database_unavailable');
    }
  }
}
