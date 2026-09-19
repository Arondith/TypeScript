export type MonitorStatus = "unknown" | "operational" | "degraded" | "down";

export interface Monitor {
  id: string;
  name: string;
  url: string;
  intervalSeconds: number;
  timeoutMs: number;
  expectedStatus: number;
  degradedAfterMs: number;
  status: MonitorStatus;
  lastCheckedAt: string | null;
  lastLatencyMs: number | null;
  nextCheckAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckResult {
  id: string;
  monitorId: string;
  checkedAt: string;
  status: MonitorStatus;
  httpStatus: number | null;
  latencyMs: number;
  error: string | null;
}

export interface PulseSnapshot {
  monitors: Monitor[];
  history: CheckResult[];
}

export interface MonitorStats {
  total: number;
  operational: number;
  degraded: number;
  down: number;
  unknown: number;
}
