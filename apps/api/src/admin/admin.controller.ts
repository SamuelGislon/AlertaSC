import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { PermissionGuard } from '../auth/permission.guard.js';
import { CurrentPrincipal } from '../security/current-principal.decorator.js';
import type { AuthenticatedRequest } from '../security/request-principal.js';
import { RequirePermission } from '../security/permissions.js';
import { AdminService } from './admin.service.js';
import { SyntheticDataGuard } from './synthetic-data.guard.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Post('operators/fixtures')
  @UseGuards(SyntheticDataGuard)
  @RequirePermission('USER_MANAGE')
  createOperator(@CurrentPrincipal() actor: AuthenticatedRequest['user'], @Body() body: { fixtureKey?: unknown }) {
    return this.admin.createOperatorFixture(actor, body?.fixtureKey);
  }

  @Patch('operators/:id/password')
  @RequirePermission('USER_MANAGE')
  resetPassword(
    @CurrentPrincipal() actor: AuthenticatedRequest['user'],
    @Param('id') id: string,
    @Body() body: { password?: unknown },
  ) {
    return this.admin.resetOperatorPassword(actor, id, body?.password);
  }

  @Patch('operators/:id/disable')
  @RequirePermission('USER_MANAGE')
  disableOperator(@CurrentPrincipal() actor: AuthenticatedRequest['user'], @Param('id') id: string) {
    return this.admin.disableOperator(actor, id);
  }

  @Post('citizens/fixtures')
  @UseGuards(SyntheticDataGuard)
  @RequirePermission('CITIZEN_MANAGE')
  createCitizen(@CurrentPrincipal() actor: AuthenticatedRequest['user'], @Body() body: { fixtureKey?: unknown }) {
    return this.admin.createCitizenFixture(actor, body?.fixtureKey);
  }

  @Get('citizens')
  @UseGuards(SyntheticDataGuard)
  @RequirePermission('CITIZEN_MANAGE')
  listCitizens() { return this.admin.listCitizenFixtures(); }

  @Delete('citizens/:id')
  @UseGuards(SyntheticDataGuard)
  @RequirePermission('CITIZEN_MANAGE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCitizen(@CurrentPrincipal() actor: AuthenticatedRequest['user'], @Param('id') id: string) {
    await this.admin.removeCitizenFixture(actor, id);
  }

  @Get('audit-events/:entityId')
  @RequirePermission('AUDIT_READ')
  audit(@Param('entityId') entityId: string) { return this.admin.auditEventsForEntity(entityId); }
}
