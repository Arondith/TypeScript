import type { MonitorStatus } from "./types.js";

interface ClassifyStatusInput {
  httpStatus: number | null;
  expectedStatus: number;
  latencyMs: number;
  degradedAfterMs: number;
  error: string | null;
}

export function classifyStatus(input: ClassifyStatusInput): MonitorStatus {
  if (input.error !== null || input.httpStatus === null) {
    return "down";
  }

  if (input.httpStatus !== input.expectedStatus) {
    return "down";
  }

  if (input.latencyMs >= input.degradedAfterMs) {
    return "degraded";
  }

  return "operational";
}
