import { MonitorService } from "./monitorService.js";

export class MonitorScheduler {
  private timer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly service: MonitorService,
    private readonly tickMs: number
  ) {}

  public start(): void {
    if (this.timer) return;

    void this.service.runDueChecks();

    this.timer = setInterval(() => {
      void this.service.runDueChecks();
    }, this.tickMs);

    this.timer.unref();
  }

  public stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
