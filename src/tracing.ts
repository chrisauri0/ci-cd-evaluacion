/**
 * Instrumentación OpenTelemetry.
 * DEBE importarse antes que cualquier otro módulo (primera línea de main.ts)
 * para que las librerías (http, express, pg) queden parchadas.
 *
 * Trazas y métricas se configuran por variables de entorno (OTEL_EXPORTER_OTLP_*).
 * Los logs se configuran de forma explícita para asegurar que se exporten.
 */

import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
if (process.env.OTEL_SDK_DISABLED !== "true") {
  const sdk = new NodeSDK({
    logRecordProcessors: [
      new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() }),
    ],
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
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
