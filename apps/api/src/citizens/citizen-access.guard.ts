import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lookupDigest } from '@alertasc/data';
import { DataSource } from 'typeorm';
import type { Request } from 'express';

export interface SyntheticCitizenRequest extends Request {
  citizenId: string;
}

@Injectable()
export class CitizenAccessGuard implements CanActivate {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SyntheticCitizenRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token || token.length > 256) throw new UnauthorizedException('invalid_citizen_session');
    const secret = this.config.get<string>('LOOKUP_HMAC_KEY') ?? process.env.LOOKUP_HMAC_KEY;
    if (!secret) throw new UnauthorizedException('invalid_citizen_session');
    const tokenHash = lookupDigest(token, secret);
    const rows = await this.database.query(
      `SELECT p.id FROM resident_preferences rp
         JOIN people p ON p.id = rp.person_id
        WHERE rp.access_token_hash = $1 AND rp.active = true AND p.synthetic = true`,
      [tokenHash],
    );
    const citizen = rows[0] as { id: string } | undefined;
    if (!citizen) throw new UnauthorizedException('invalid_citizen_session');
    request.citizenId = citizen.id;
    return true;
  }
}
