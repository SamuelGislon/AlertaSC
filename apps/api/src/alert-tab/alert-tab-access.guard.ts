import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AlertTabService } from './alert-tab.service.js';
import type { AuthenticatedRequest } from '../security/request-principal.js';

@Injectable()
export class AlertTabAccessGuard implements CanActivate {
  constructor(@Inject(AlertTabService) private readonly alertTab: AlertTabService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    await this.alertTab.assertAccess(request.user.sessionId);
    return true;
  }
}
