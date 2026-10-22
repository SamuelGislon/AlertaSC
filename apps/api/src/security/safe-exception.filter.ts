import { Catch, type ArgumentsHost, type ExceptionFilter, HttpException, HttpStatus, Inject } from '@nestjs/common';
import type { Response } from 'express';
import { SafeLogger } from './safe-logger.js';

const PUBLIC_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Requisição inválida.',
  [HttpStatus.UNAUTHORIZED]: 'Credenciais inválidas.',
  [HttpStatus.FORBIDDEN]: 'Acesso não autorizado.',
  [HttpStatus.NOT_FOUND]: 'Recurso não encontrado.',
  [HttpStatus.CONFLICT]: 'A operação conflita com o estado atual.',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erro interno. Tente novamente mais tarde.',
};

const SAFE_PUBLIC_MESSAGES_BY_CODE: Record<string, string> = {
  alert_tab_occupied: 'A aba de alertas está em uso por outra sessão.',
  alert_tab_lock_required: 'A aba de alertas não está liberada para esta sessão.',
  alert_expired: 'Este alerta expirou e não aceita novas ações.',
  alert_already_claimed: 'Este alerta já foi assumido por outro operador.',
  alert_claim_required: 'Assuma o alerta antes de registrar uma decisão.',
  alert_not_available: 'Este alerta não está disponível para essa ação.',
  invalid_alert_transition: 'A mudança de estado não é permitida.',
};

function safePublicMessage(exception: HttpException, status: number): string {
  const body = exception.getResponse();
  const candidate = typeof body === 'string'
    ? body
    : typeof body === 'object' && body !== null && 'message' in body
      ? body.message
      : undefined;
  if (typeof candidate === 'string' && SAFE_PUBLIC_MESSAGES_BY_CODE[candidate]) {
    return SAFE_PUBLIC_MESSAGES_BY_CODE[candidate]!;
  }
  return PUBLIC_MESSAGES[status] ?? (status < 500 ? 'Não foi possível concluir a operação.' : PUBLIC_MESSAGES[500]!);
}

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  constructor(@Inject(SafeLogger) private readonly logger: SafeLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException
      ? safePublicMessage(exception, status)
      : PUBLIC_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR]!;
    this.logger.error(status >= 500 ? 'request_failed' : 'framework_event');
    response.status(status).json({ statusCode: status, message });
  }
}
