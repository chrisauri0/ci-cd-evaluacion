import { Injectable, NestMiddleware } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import type { NextFunction, Request, Response } from 'express';
import { appLogger } from './app-logger';

const meter = metrics.getMeter('api-http');

/** Latencia por petición (ms) -> histograma. */
const duration = meter.createHistogram('http_server_request_duration_ms', {
  description: 'Latencia de las peticiones HTTP por endpoint',
  unit: 'ms',
});
/** Volumen de peticiones (se obtiene req/s con rate() en el dashboard). */
const requests = meter.createCounter('http_server_requests_total', {
  description: 'Total de peticiones HTTP por endpoint y status code',
});
/** Peticiones con status >= 400. */
const errors = meter.createCounter('http_server_errors_total', {
  description: 'Total de respuestas HTTP con error (status >= 400)',
});

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      const route = req.route?.path ? `${req.baseUrl ?? ''}${req.route.path}` : req.path;
      const status = res.statusCode;
      const attrs = {
        http_method: req.method,
        http_route: route,
        http_status_code: status,
        status_class: `${Math.floor(status / 100)}xx`,
      };

      duration.record(ms, attrs);
      requests.add(1, attrs);
      if (status >= 400) errors.add(1, attrs);

      // Se omite el ruido de archivos estáticos
      if (route.startsWith('/api')) {
        appLogger.event(status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', `${req.method} ${route} ${status}`, {
          ...attrs,
          duration_ms: Math.round(ms * 100) / 100,
          timestamp: new Date().toISOString(),
        });
      }
    });

    next();
  }
}
