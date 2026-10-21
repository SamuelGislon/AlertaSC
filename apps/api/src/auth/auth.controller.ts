import { Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, REFRESH_COOKIE_NAME, REFRESH_TTL_MS } from './auth.service.js';
import { JwtAuthGuard } from './auth.guard.js';
import type { AuthenticatedRequest } from '../security/request-principal.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  async login(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(request.body);
    this.setRefreshCookie(response, session.refreshToken);
    return { accessToken: session.accessToken, operator: session.operator };
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const oldToken = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const session = await this.auth.refresh(oldToken);
    this.setRefreshCookie(response, session.refreshToken);
    return { accessToken: session.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    const token = request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await this.auth.logout(token);
    response.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return { id: request.user.operatorId, roles: request.user.roles };
  }

  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(REFRESH_COOKIE_NAME, token, { ...this.cookieOptions(), maxAge: REFRESH_TTL_MS });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/api/v1/auth',
    };
  }
}
