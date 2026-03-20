import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

import { time } from "../utils/format-time";

describe("time", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats diff < 1000ms as milliseconds", () => {
    // Date.now() = 1000, ts = 1000 - diff
    vi.setSystemTime(1000);
    expect(time(1000 - 500)).toBe("500ms");   // diff = 500
    expect(time(1000 - 999)).toBe("999ms");   // diff = 999
    expect(time(1000)).toBe("0ms");           // diff = 0
  });

  it("formats diff >= 1000ms and < 60000ms as seconds", () => {
    vi.setSystemTime(10_000);
    expect(time(0)).toBe("10.0s");            // diff = 10_000ms

    vi.setSystemTime(5_500);
    expect(time(0)).toBe("5.5s");             // diff = 5_500ms
  });

  it("formats diff >= 60000ms as minutes", () => {
    vi.setSystemTime(120_000);
    expect(time(0)).toBe("2m");               // diff = 120_000ms

    vi.setSystemTime(90_000);
    expect(time(0)).toBe("1m");               // diff = 90_000ms (1.5m → floor = 1)
  });

  it("appends prefix when provided", () => {
    vi.setSystemTime(500);
    expect(time(0, "ago")).toBe("500ms ago");
  });

  it("has no prefix when not provided", () => {
    vi.setSystemTime(500);
    expect(time(0)).toBe("500ms");
  });

  it("diff = 0ms renders as '0ms'", () => {
    vi.setSystemTime(100);
    expect(time(100)).toBe("0ms");
  });
});
