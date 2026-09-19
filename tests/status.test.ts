import { describe, expect, it } from "vitest";
import { classifyStatus } from "../src/domain/status.js";

describe("classifyStatus", () => {
  it("returns operational for expected status and healthy latency", () => {
    expect(classifyStatus({
      httpStatus: 200,
      expectedStatus: 200,
      latencyMs: 120,
      degradedAfterMs: 1000,
      error: null
    })).toBe("operational");
  });

  it("returns degraded when latency crosses the threshold", () => {
    expect(classifyStatus({
      httpStatus: 200,
      expectedStatus: 200,
      latencyMs: 1500,
      degradedAfterMs: 1500,
      error: null
    })).toBe("degraded");
  });

  it("returns down for an unexpected HTTP status", () => {
    expect(classifyStatus({
      httpStatus: 503,
      expectedStatus: 200,
      latencyMs: 80,
      degradedAfterMs: 1000,
      error: null
    })).toBe("down");
  });

  it("returns down for request errors", () => {
    expect(classifyStatus({
      httpStatus: null,
      expectedStatus: 200,
      latencyMs: 5000,
      degradedAfterMs: 1000,
      error: "Request timed out"
    })).toBe("down");
  });
});
