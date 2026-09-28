// socket/instrumentation.js
const { MeterProvider, PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { metrics, diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR); // surface real export errors in logs

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (!endpoint) {
  console.warn("OTEL_EXPORTER_OTLP_ENDPOINT not set — skipping OTel metrics setup");
} else {
  const exporter = new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` });
  metrics.setGlobalMeterProvider(
    new MeterProvider({
      readers: [new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 5000 })],
    })
  );
}