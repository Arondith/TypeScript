import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { classifyStatus } from "../domain/status.js";
import type {
  CheckResult,
  Monitor,
  MonitorStats
} from "../domain/types.js";
import { ConflictError, NotFoundError } from "../errors.js";
import type {
  CreateMonitorInput,
  UpdateMonitorInput
} from "../http/schemas.js";
import { FileRepository } from "../infra/fileRepository.js";

export class MonitorService {
  private readonly activeChecks = new Set<string>();

  public constructor(private readonly repository: FileRepository) {}

  public async list(): Promise<Monitor[]> {
    const monitors = await this.repository.getMonitors();
    return monitors.sort((a, b) => a.name.localeCompare(b.name));
  }

  public async get(id: string): Promise<Monitor> {
    const monitor = await this.repository.getMonitor(id);
    if (!monitor) throw new NotFoundError("Monitor not found.");
    return monitor;
  }

  public async create(input: CreateMonitorInput): Promise<Monitor> {
    const existing = await this.repository.getMonitors();
    const normalizedUrl = new URL(input.url).toString();

    if (existing.some((monitor) => monitor.url === normalizedUrl)) {
      throw new ConflictError("A monitor for this URL already exists.");
    }

    const now = new Date();
    const monitor: Monitor = {
      id: randomUUID(),
      name: input.name,
      url: normalizedUrl,
      intervalSeconds: input.intervalSeconds,
      timeoutMs: input.timeoutMs,
      expectedStatus: input.expectedStatus,
      degradedAfterMs: input.degradedAfterMs,
      status: "unknown",
      lastCheckedAt: null,
      lastLatencyMs: null,
      nextCheckAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await this.repository.saveMonitor(monitor);
    return monitor;
  }

  public async update(id: string, input: UpdateMonitorInput): Promise<Monitor> {
    const current = await this.get(id);

    const next: Monitor = {
      ...current,
      ...input,
      url: input.url ? new URL(input.url).toString() : current.url,
      updatedAt: new Date().toISOString()
    };

    await this.repository.saveMonitor(next);
    return next;
  }

  public async remove(id: string): Promise<void> {
    const deleted = await this.repository.deleteMonitor(id);
    if (!deleted) throw new NotFoundError("Monitor not found.");
  }

  public async check(id: string): Promise<CheckResult> {
    const monitor = await this.get(id);

    if (this.activeChecks.has(id)) {
      throw new ConflictError("A check is already running for this monitor.");
    }

    this.activeChecks.add(id);
    const startedAt = performance.now();

    let httpStatus: number | null = null;
    let error: string | null = null;

    try {
      const response = await fetch(monitor.url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(monitor.timeoutMs),
        headers: {
          "user-agent": "PulseWatch/1.0"
        }
      });

      httpStatus = response.status;
      await response.body?.cancel();
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Unknown request error";
    } finally {
      this.activeChecks.delete(id);
    }

    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
    const checkedAt = new Date();
    const status = classifyStatus({
      httpStatus,
      expectedStatus: monitor.expectedStatus,
      latencyMs,
      degradedAfterMs: monitor.degradedAfterMs,
      error
    });

    const result: CheckResult = {
      id: randomUUID(),
      monitorId: id,
      checkedAt: checkedAt.toISOString(),
      status,
      httpStatus,
      latencyMs,
      error
    };

    const updated: Monitor = {
      ...monitor,
      status,
      lastCheckedAt: result.checkedAt,
      lastLatencyMs: latencyMs,
      nextCheckAt: new Date(
        checkedAt.getTime() + monitor.intervalSeconds * 1000
      ).toISOString(),
      updatedAt: result.checkedAt
    };

    await this.repository.saveMonitor(updated);
    await this.repository.addCheckResult(result);

    return result;
  }

  public async getHistory(id: string, limit = 50): Promise<CheckResult[]> {
    await this.get(id);
    return this.repository.getHistory(id, Math.min(Math.max(limit, 1), 100));
  }

  public async getStats(): Promise<MonitorStats> {
    const monitors = await this.repository.getMonitors();

    return {
      total: monitors.length,
      operational: monitors.filter((monitor) => monitor.status === "operational").length,
      degraded: monitors.filter((monitor) => monitor.status === "degraded").length,
      down: monitors.filter((monitor) => monitor.status === "down").length,
      unknown: monitors.filter((monitor) => monitor.status === "unknown").length
    };
  }

  public async runDueChecks(): Promise<void> {
    const monitors = await this.repository.getMonitors();
    const now = Date.now();

    const due = monitors.filter(
      (monitor) =>
        new Date(monitor.nextCheckAt).getTime() <= now &&
        !this.activeChecks.has(monitor.id)
    );

    await Promise.allSettled(due.map((monitor) => this.check(monitor.id)));
  }
}
