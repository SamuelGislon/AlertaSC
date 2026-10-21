import { Body, Controller, createParamDecorator, Delete, ExecutionContext, Get, HttpCode, HttpStatus, Inject, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from '../admin/admin.service.js';
import { SyntheticDataGuard } from '../admin/synthetic-data.guard.js';
import { CitizenAccessGuard, type SyntheticCitizenRequest } from './citizen-access.guard.js';

const CitizenId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<SyntheticCitizenRequest>().citizenId;
});

@Controller('citizens')
export class CitizenController {
  constructor(@Inject(AdminService) private readonly citizens: AdminService) {}

  @Post('fixtures')
  @UseGuards(SyntheticDataGuard)
  createSyntheticFixture(@Body() body: { fixtureKey?: unknown }) {
    return this.citizens.createSelfServiceCitizenFixture(body?.fixtureKey);
  }

  @Get('me')
  @UseGuards(SyntheticDataGuard, CitizenAccessGuard)
  me(@CitizenId() citizenId: string) {
    return this.citizens.getCitizenPreferences(citizenId);
  }

  @Patch('me/preferences')
  @UseGuards(SyntheticDataGuard, CitizenAccessGuard)
  updatePreferences(@CitizenId() citizenId: string, @Body() body: unknown) {
    return this.citizens.updateCitizenPreferences(citizenId, body);
  }

  @Delete('me')
  @UseGuards(SyntheticDataGuard, CitizenAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CitizenId() citizenId: string) {
    await this.citizens.removeSelfServiceCitizen(citizenId);
  }
}
