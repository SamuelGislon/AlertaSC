import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type Permission } from '@alertasc/domain';
import { REQUIRED_PERMISSION } from '../security/permissions.js';
import type { AuthenticatedRequest } from '../security/request-principal.js';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission>(REQUIRED_PERMISSION, [
      context.getHandler(), context.getClass(),
    ]);
    if (!permission) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user || !hasPermission(request.user.roles, permission)) throw new ForbiddenException('permission_denied');
    return true;
  }
}
