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

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  constructor(@Inject(SafeLogger) private readonly logger: SafeLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = PUBLIC_MESSAGES[status] ?? (status < 500 ? 'Não foi possível concluir a operação.' : PUBLIC_MESSAGES[500]!);
    this.logger.error(status >= 500 ? 'request_failed' : 'framework_event');
    response.status(status).json({ statusCode: status, message });
  }
}
