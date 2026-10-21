import type { OperatorRole } from '@alertasc/domain';
import type { Request } from 'express';

export interface RequestPrincipal {
  operatorId: string;
  sessionId: string;
  roles: OperatorRole[];
}

export interface AuthenticatedRequest extends Request {
  user: RequestPrincipal;
}
