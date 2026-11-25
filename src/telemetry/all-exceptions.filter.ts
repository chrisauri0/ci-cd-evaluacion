import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { appLogger } from './app-logger';

/** Registra excepciones no controladas (con stack) y responde JSON uniforme. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return res.status(status).json(exception.getResponse());
    }

    const err = exception as Error;
    appLogger.event('error', `Excepción no controlada: ${err?.message}`, {
      stack: err?.stack,
      exception_type: err?.name,
    });
    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, message: 'Error interno del servidor' });
  }
}
