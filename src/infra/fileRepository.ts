import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CheckResult, Monitor, PulseSnapshot } from "../domain/types.js";

const emptySnapshot = (): PulseSnapshot => ({ monitors: [], history: [] });

export class FileRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  public constructor(
    private readonly filePath: string,
    private readonly historyLimit: number
  ) {}

  public async init(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      await readFile(this.filePath, "utf8");
    } catch {
      await this.writeSnapshot(emptySnapshot());
    }
  }

  public async getMonitors(): Promise<Monitor[]> {
    return (await this.readSnapshot()).monitors;
  }

  public async getMonitor(id: string): Promise<Monitor | undefined> {
    return (await this.readSnapshot()).monitors.find((monitor) => monitor.id === id);
  }

  public async saveMonitor(monitor: Monitor): Promise<void> {
    await this.enqueue(async () => {
      const snapshot = await this.readSnapshot();
      const index = snapshot.monitors.findIndex((item) => item.id === monitor.id);

      if (index >= 0) {
        snapshot.monitors[index] = monitor;
      } else {
        snapshot.monitors.push(monitor);
      }

      await this.writeSnapshot(snapshot);
    });
  }

  public async deleteMonitor(id: string): Promise<boolean> {
    let deleted = false;

    await this.enqueue(async () => {
      const snapshot = await this.readSnapshot();
      const nextMonitors = snapshot.monitors.filter((monitor) => monitor.id !== id);
      deleted = nextMonitors.length !== snapshot.monitors.length;

      if (deleted) {
        snapshot.monitors = nextMonitors;
        snapshot.history = snapshot.history.filter((result) => result.monitorId !== id);
        await this.writeSnapshot(snapshot);
      }
    });

    return deleted;
  }

  public async addCheckResult(result: CheckResult): Promise<void> {
    await this.enqueue(async () => {
      const snapshot = await this.readSnapshot();
      snapshot.history.unshift(result);

      const perMonitorCounts = new Map<string, number>();
      snapshot.history = snapshot.history.filter((item) => {
        const count = perMonitorCounts.get(item.monitorId) ?? 0;
        if (count >= this.historyLimit) return false;
        perMonitorCounts.set(item.monitorId, count + 1);
        return true;
      });

      await this.writeSnapshot(snapshot);
    });
  }

  public async getHistory(monitorId: string, limit: number): Promise<CheckResult[]> {
    return (await this.readSnapshot()).history
      .filter((result) => result.monitorId === monitorId)
      .slice(0, limit);
  }

  private async readSnapshot(): Promise<PulseSnapshot> {
    const raw = await readFile(this.filePath, "utf8");
    return JSON.parse(raw) as PulseSnapshot;
  }

  private async writeSnapshot(snapshot: PulseSnapshot): Promise<void> {
    const temporaryPath = `${this.filePath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(snapshot, null, 2), "utf8");
    await rename(temporaryPath, this.filePath);
  }

  private async enqueue(operation: () => Promise<void>): Promise<void> {
    const queued = this.writeQueue.then(operation, operation);
    this.writeQueue = queued.catch(() => undefined);
    await queued;
  }
}
