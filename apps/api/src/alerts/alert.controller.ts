import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { PermissionGuard } from '../auth/permission.guard.js';
import { AlertTabAccessGuard } from '../alert-tab/alert-tab-access.guard.js';
import { RequirePermission } from '../security/permissions.js';
import { CurrentPrincipal } from '../security/current-principal.decorator.js';
import type { AuthenticatedRequest } from '../security/request-principal.js';
import { AlertService } from './alert.service.js';

@Controller('alerts')
@UseGuards(JwtAuthGuard, PermissionGuard, AlertTabAccessGuard)
export class AlertController {
  constructor(@Inject(AlertService) private readonly alerts: AlertService) {}

  @Get()
  @RequirePermission('ALERT_READ')
  list(@CurrentPrincipal() principal: AuthenticatedRequest['user']) {
    return this.alerts.list(principal);
  }

  @Get(':id')
  @RequirePermission('ALERT_READ')
  get(@CurrentPrincipal() principal: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.alerts.get(principal, id);
  }

  @Get(':id/audit')
  @RequirePermission('ALERT_READ')
  audit(@CurrentPrincipal() principal: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.alerts.auditFor(principal, id);
  }

  @Post(':id/claim')
  @RequirePermission('ALERT_EDIT')
  claim(@CurrentPrincipal() principal: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.alerts.claim(principal, id);
  }

  @Post(':id/transition')
  transition(
    @CurrentPrincipal() principal: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @Body() body: { status?: unknown; reason?: unknown },
  ) {
    return this.alerts.transition(principal, id, body?.status, body?.reason);
  }
}
