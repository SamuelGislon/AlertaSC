import type { LoggerService } from '@nestjs/common';

const SAFE_CODES = new Set([
  'application_started', 'application_ready', 'request_failed', 'worker_started',
  'alert_expiration_run', 'synthetic_seed_completed', 'operator_bootstrap_required',
]);

export class SafeLogger implements LoggerService {
  log(message: unknown): void { this.write('info', message); }
  error(message: unknown): void { this.write('error', message); }
  warn(message: unknown): void { this.write('warn', message); }
  debug(message: unknown): void { this.write('debug', message); }
  verbose(message: unknown): void { this.write('trace', message); }
  fatal(message: unknown): void { this.write('fatal', message); }

  private write(level: string, message: unknown): void {
    const event = typeof message === 'string' && SAFE_CODES.has(message) ? message : 'framework_event';
    process.stdout.write(`${JSON.stringify({ level, event, timestamp: new Date().toISOString() })}\n`);
  }
}
