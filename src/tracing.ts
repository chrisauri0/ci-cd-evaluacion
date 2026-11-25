/**
 * Instrumentación OpenTelemetry.
 * DEBE importarse antes que cualquier otro módulo (primera línea de main.ts)
 * para que las librerías (http, express, pg) queden parchadas.
 *
 * Trazas y métricas: NodeSDK + variables de entorno OTEL_EXPORTER_OTLP_*.
 * Logs: proveedor creado y registrado explícitamente aquí.
 */
import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";

const enabled = process.env.OTEL_SDK_DISABLED !== "true";

export const loggerProvider: LoggerProvider | undefined = enabled
  ? new LoggerProvider({
      resource: resourceFromAttributes({
        "service.name":
          process.env.OTEL_SERVICE_NAME ?? "api-usuarios-productos",
        "deployment.environment": "production",
      }),
      processors: [
        new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() }),
      ],
    })
  : undefined;

if (enabled && loggerProvider) {
  logs.setGlobalLoggerProvider(loggerProvider);

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
    Promise.allSettled([sdk.shutdown(), loggerProvider.shutdown()]).finally(
      () => process.exit(0),
    );
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
