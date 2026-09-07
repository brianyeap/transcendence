import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("ft-transcendence-test");

const testCounter = meter.createCounter(
  "transcendence_otel_test_total",
  {
    description: "Temporary metric used to test OpenTelemetry",
  }
);

export async function GET() {
  testCounter.add(1);

  return Response.json({
    message: "OTel test metric recorded",
  });
}