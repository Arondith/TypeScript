import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp, type AppRuntime } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

describe("PulseWatch API", () => {
  let runtime: AppRuntime;
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "pulsewatch-"));

    const config: AppConfig = {
      PORT: 3000,
      HOST: "127.0.0.1",
      DATA_FILE: join(directory, "pulsewatch.json"),
      SCHEDULER_TICK_MS: 5000,
      HISTORY_LIMIT: 100
    };

    runtime = await buildApp(config);
  });

  afterEach(async () => {
    runtime.scheduler.stop();
    await runtime.app.close();
    await rm(directory, { recursive: true, force: true });
  });

  it("creates and lists monitors", async () => {
    const createResponse = await runtime.app.inject({
      method: "POST",
      url: "/api/monitors",
      payload: {
        name: "Example",
        url: "https://example.com",
        intervalSeconds: 60,
        timeoutMs: 5000,
        expectedStatus: 200,
        degradedAfterMs: 1500
      }
    });

    expect(createResponse.statusCode).toBe(201);

    const created = createResponse.json<{ id: string; name: string }>();
    expect(created.name).toBe("Example");

    const listResponse = await runtime.app.inject({
      method: "GET",
      url: "/api/monitors"
    });

    expect(listResponse.statusCode).toBe(200);
    const monitors = listResponse.json<Array<{ id: string }>>();
    expect(monitors).toHaveLength(1);
    expect(monitors[0]?.id).toBe(created.id);
  });

  it("rejects invalid monitor input", async () => {
    const response = await runtime.app.inject({
      method: "POST",
      url: "/api/monitors",
      payload: {
        name: "X",
        url: "ftp://example.com"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ type: string }>().type).toBe("validation_error");
  });

  it("returns aggregate monitor stats", async () => {
    const response = await runtime.app.inject({
      method: "GET",
      url: "/api/stats"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      total: 0,
      operational: 0,
      degraded: 0,
      down: 0,
      unknown: 0
    });
  });
});
