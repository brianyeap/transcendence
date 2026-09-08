// import { metrics } from "@opentelemetry/api";

// const meter = metrics.getMeter("ft-transcendence-test");

// const testCounter = meter.createCounter(
//   "transcendence_otel_test_total",
//   {
//     description: "Temporary metric used to test OpenTelemetry",
//   }
// );

// export async function GET() {
//   testCounter.add(1);

//   return Response.json({
//     message: "OTel test metric recorded",
//   });
// }

import {
  gamesStarted,
  gamesCompleted,
  activeGames,
  matchesPlayed,
} from "@/lib/metrics";

export async function GET() {
  gamesStarted.add(1);
  gamesCompleted.add(1);
  activeGames.add(1);
  activeGames.add(-1);
  matchesPlayed.add(1);

  return Response.json({
    message: "Test metrics recorded",
  });
}