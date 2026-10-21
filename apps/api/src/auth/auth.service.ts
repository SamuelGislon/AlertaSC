import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { DataSource, type QueryRunner } from 'typeorm';
import { isValidCpf, normalizeCpf, type OperatorRole } from '@alertasc/domain';
import { lookupDigest, returnedRows } from '@alertasc/data';
import { AuditService } from '../audit/audit.service.js';
import type { RequestPrincipal } from '../security/request-principal.js';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const REFRESH_COOKIE = 'alertasc_refresh';

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  refreshExpiresAt: Date;
}

interface AccessPayload { sub: string; sid: string; }
interface RefreshPayload extends AccessPayload { jti: string; }

@Injectable()
export class AuthService {
  constructor(
    @Inject(DataSource) private readonly database: DataSource,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.requireSecret('JWT_ACCESS_SECRET');
      this.requireSecret('JWT_REFRESH_SECRET');
      this.requireSecret('FIELD_ENCRYPTION_KEY', 32);
      this.requireSecret('LOOKUP_HMAC_KEY');
      if (this.config.get<string>('PERSONAL_DATA_MODE') !== 'approved') {
        throw new Error('Production requires an explicit approved personal-data mode.');
      }
    }
  }

  async login(input: unknown): Promise<IssuedSession & { operator: { id: string; roles: OperatorRole[] } }> {
    const body = input as { cpf?: unknown; password?: unknown } | null;
    const cpf = typeof body?.cpf === 'string' ? normalizeCpf(body.cpf) : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (password.length === 0 || password.length > 128 || !isValidCpf(cpf)) {
      await this.performDummyHash(password);
      throw new UnauthorizedException('invalid_credentials');
    }

    const rows = await this.database.query(
      `SELECT oa.id, oa.roles, oa.password_hash
         FROM operator_accounts oa
         JOIN people p ON p.id = oa.person_id
        WHERE p.cpf_lookup_hash = $1 AND oa.active = true`,
      [lookupDigest(cpf, this.requiredConfig('LOOKUP_HMAC_KEY'))],
    );
    const account = rows[0] as { id: string; roles: OperatorRole[]; password_hash: string } | undefined;
    if (!account || !(await argon2.verify(account.password_hash, password))) {
      if (!account) await this.performDummyHash(password);
      throw new UnauthorizedException('invalid_credentials');
    }

    const session = await this.issueSession(account.id, account.roles);
    return { ...session, operator: { id: account.id, roles: account.roles } };
  }

  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw new UnauthorizedException('refresh_unavailable');
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) throw new UnauthorizedException('refresh_unavailable');

    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = await runner.query(
        `SELECT rs.id, rs.operator_id, rs.token_hash, rs.expires_at, rs.revoked_at, oa.roles
           FROM refresh_sessions rs
           JOIN operator_accounts oa ON oa.id = rs.operator_id
          WHERE rs.id = $1 AND oa.active = true
          FOR UPDATE OF rs`,
        [payload.sid],
      );
      const session = rows[0] as {
        id: string; operator_id: string; token_hash: string; expires_at: Date; revoked_at: Date | null;
        roles: OperatorRole[];
      } | undefined;
      if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()
        || !sameDigest(session.token_hash, tokenDigest(refreshToken))) {
        throw new UnauthorizedException('refresh_unavailable');
      }

      const next = await this.issueSession(session.operator_id, session.roles, runner);
      await runner.query(
        'UPDATE refresh_sessions SET revoked_at = now(), replaced_by = $2 WHERE id = $1',
        [session.id, next.sessionId],
      );
      await runner.commitTransaction();
      return next;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const payload = await this.verifyRefreshToken(refreshToken);
    const sessionId = payload?.sid;
    if (!sessionId) return;

    const runner = this.database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const released = returnedRows<{ operator_id: string }>(await runner.query(
        'DELETE FROM alert_tab_lease WHERE session_id = $1 RETURNING operator_id',
        [sessionId],
      ));
      const sessions = returnedRows<{ operator_id: string }>(await runner.query(
        'UPDATE refresh_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING operator_id',
        [sessionId],
      ));
      const operatorId = (sessions[0]?.operator_id ?? released[0]?.operator_id) as string | undefined;
      if (operatorId) {
        if (released.length) {
          const claims = returnedRows<{ alert_id: string }>(await runner.query(
            `UPDATE alert_claims SET released_at = now()
              WHERE operator_id = $1 AND released_at IS NULL RETURNING alert_id`,
            [operatorId],
          ));
          for (const claim of claims) {
            await this.audit.record({
              actorId: operatorId,
              action: 'ALERT_CLAIM_RELEASED',
              entityType: 'alert',
              entityId: claim.alert_id,
              metadata: { session_action: 'released' },
            }, runner);
          }
          await this.audit.record({
            actorId: operatorId,
            action: 'ALERT_TAB_RELEASED',
            entityType: 'alert_tab',
            entityId: randomUUID(),
            metadata: { session_action: 'logout' },
          }, runner);
        }
      }
      if (operatorId && sessions.length) {
        await this.audit.record({
          actorId: operatorId,
          action: 'SESSION_REVOKED',
          entityType: 'operator_session',
          entityId: randomUUID(),
          metadata: { session_action: 'logout' },
        }, runner);
      }
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async authenticateAccessToken(token: string): Promise<RequestPrincipal | null> {
    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: this.requiredConfig('JWT_ACCESS_SECRET'),
        algorithms: ['HS256'],
      });
      const rows = await this.database.query(
        `SELECT oa.id AS operator_id, oa.roles, rs.id AS session_id
           FROM refresh_sessions rs
           JOIN operator_accounts oa ON oa.id = rs.operator_id
          WHERE rs.id = $1 AND rs.operator_id = $2 AND rs.revoked_at IS NULL
            AND rs.expires_at > now() AND oa.active = true`,
        [payload.sid, payload.sub],
      );
      const row = rows[0] as { operator_id: string; roles: OperatorRole[]; session_id: string } | undefined;
      if (!row) return null;
      return { operatorId: row.operator_id, sessionId: row.session_id, roles: row.roles };
    } catch {
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshPayload | null> {
    try {
      return await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.requiredConfig('JWT_REFRESH_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }
  }

  requiredConfig(key: string): string {
    const value = this.config.get<string>(key) ?? process.env[key];
    if (!value) throw new Error(`Required runtime setting is missing: ${key}`);
    return value;
  }

  private requireSecret(key: string, exactLength?: number): void {
    const value = this.requiredConfig(key);
    if ((exactLength !== undefined && Buffer.byteLength(value) !== exactLength)
      || (exactLength === undefined && Buffer.byteLength(value) < 32)) {
      throw new Error(`Runtime secret ${key} has an invalid length.`);
    }
  }

  private async performDummyHash(password: string): Promise<void> {
    await argon2.hash(password || 'invalid-login', { type: argon2.argon2id });
  }

  private async issueSession(operatorId: string, roles: OperatorRole[], runner?: QueryRunner): Promise<IssuedSession> {
    const sessionId = randomUUID();
    const jti = randomUUID();
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1_000);
    const accessToken = await this.jwt.signAsync(
      { sub: operatorId, sid: sessionId },
      { secret: this.requiredConfig('JWT_ACCESS_SECRET'), algorithm: 'HS256', expiresIn: ACCESS_TTL_SECONDS },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: operatorId, sid: sessionId, jti },
      { secret: this.requiredConfig('JWT_REFRESH_SECRET'), algorithm: 'HS256', expiresIn: REFRESH_TTL_SECONDS },
    );
    const executor = runner?.manager ?? this.database.manager;
    await executor.query(
      `INSERT INTO refresh_sessions (id, operator_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, operatorId, tokenDigest(refreshToken), refreshExpiresAt],
    );
    return { accessToken, refreshToken, sessionId, refreshExpiresAt };
  }
}

export const REFRESH_COOKIE_NAME = REFRESH_COOKIE;
export const REFRESH_TTL_MS = REFRESH_TTL_SECONDS * 1_000;

function tokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sameDigest(expected: string, actual: string): boolean {
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(actual, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
