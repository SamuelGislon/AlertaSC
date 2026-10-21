import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SyntheticDataGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'production' || process.env.PERSONAL_DATA_MODE !== 'synthetic') {
      throw new ForbiddenException('synthetic_fixtures_only');
    }
    return true;
  }
}
