import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../security/request-principal.js';
import { AuthService } from './auth.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('authentication_required');
    const principal = await this.auth.authenticateAccessToken(header.slice(7));
    if (!principal) throw new UnauthorizedException('authentication_required');
    request.user = principal;
    return true;
  }
}
