import { LoggerService } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

const otelLogger = logs.getLogger('api-logger');

type Level = 'debug' | 'info' | 'warn' | 'error';

const SEVERITY: Record<Level, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

/**
 * Logger estructurado: escribe JSON en stdout y emite el mismo evento
 * como LogRecord OpenTelemetry (se exporta a OpenObserve vía OTLP).
 */
export class AppLogger implements LoggerService {
  private emit(level: Level, message: any, attrs: Record<string, any> = {}) {
    const text = typeof message === 'string' ? message : JSON.stringify(message);
    const record = { timestamp: new Date().toISOString(), level, message: text, ...attrs };
    (level === 'error' ? console.error : console.log)(JSON.stringify(record));
    otelLogger.emit({
      severityNumber: SEVERITY[level],
      severityText: level.toUpperCase(),
      body: text,
      attributes: attrs,
    });
  }

  /** Logger con atributos propios (usado por el middleware y el filtro de excepciones). */
  event(level: Level, message: string, attrs: Record<string, any> = {}) {
    this.emit(level, message, attrs);
  }

  log(message: any, context?: string) {
    this.emit('info', message, context ? { context } : {});
  }
  error(message: any, trace?: string, context?: string) {
    this.emit('error', message, { ...(trace ? { stack: trace } : {}), ...(context ? { context } : {}) });
  }
  warn(message: any, context?: string) {
    this.emit('warn', message, context ? { context } : {});
  }
  debug(message: any, context?: string) {
    this.emit('debug', message, context ? { context } : {});
  }
  verbose(message: any, context?: string) {
    this.emit('debug', message, context ? { context } : {});
  }
}

export const appLogger = new AppLogger();
