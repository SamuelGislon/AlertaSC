import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../security/permissions.js';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { PermissionGuard } from '../auth/permission.guard.js';
import type { AuthenticatedRequest } from '../security/request-principal.js';
import { AlertTabService } from './alert-tab.service.js';
import { CurrentPrincipal } from '../security/current-principal.decorator.js';

@Controller('alert-tab')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AlertTabController {
  constructor(@Inject(AlertTabService) private readonly alertTab: AlertTabService) {}

  @Post('acquire')
  @RequirePermission('ALERT_TAB_ACCESS')
  acquire(@CurrentPrincipal() principal: AuthenticatedRequest['user']) {
    return this.alertTab.acquire(principal);
  }

  @Post('release')
  @RequirePermission('ALERT_TAB_ACCESS')
  async release(@CurrentPrincipal() principal: AuthenticatedRequest['user']) {
    return { released: await this.alertTab.release(principal) };
  }

  @Post('recover')
  @RequirePermission('USER_MANAGE')
  async recover(
    @CurrentPrincipal() principal: AuthenticatedRequest['user'],
    @Body() body: { reason?: unknown },
  ) {
    await this.alertTab.recover(principal, body?.reason);
    return { recovered: true };
  }
}
