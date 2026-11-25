/**
 * Instrumentación OpenTelemetry.
 * DEBE importarse antes que cualquier otro módulo (primera línea de main.ts)
 * para que las librerías (http, express, pg) queden parchadas.
 *
 * Los exportadores (traces, metrics, logs) se configuran por variables de entorno:
 *   OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_PROTOCOL=http/json,
 *   OTEL_TRACES_EXPORTER=otlp, OTEL_METRICS_EXPORTER=otlp, OTEL_LOGS_EXPORTER=otlp
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

if (process.env.OTEL_SDK_DISABLED !== 'true') {
  const sdk = new NodeSDK({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new NestInstrumentation(),
      new PgInstrumentation({ enhancedDatabaseReporting: true }),
    ],
  });

  sdk.start();

  const shutdown = () =>
    sdk
      .shutdown()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
