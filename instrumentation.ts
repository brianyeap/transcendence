import { registerOTel } from '@vercel/otel';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

export function register() {
  const metricExporter = new OTLPMetricExporter({
    url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000,
  });

  registerOTel({
    serviceName: 'ft-transcendence',
    metricReaders: [metricReader],
  });
}