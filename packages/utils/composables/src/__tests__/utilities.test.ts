// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { signal } from "@praxisjs/core/internal";

import { usePagination, useClipboard, useGeolocation, useTimeAgo } from "../utilities";

describe("usePagination", () => {
  it("starts on page 1 by default", () => {
    const p = usePagination({ total: 100, pageSize: 10 });
    expect(p.page()).toBe(1);
  });

  it("respects initial page option", () => {
    const p = usePagination({ total: 100, pageSize: 10, initial: 3 });
    expect(p.page()).toBe(3);
  });

  it("computes total pages correctly", () => {
    expect(usePagination({ total: 100, pageSize: 10 }).totalPages()).toBe(10);
    expect(usePagination({ total: 101, pageSize: 10 }).totalPages()).toBe(11);
    expect(usePagination({ total: 5, pageSize: 10 }).totalPages()).toBe(1);
  });

  it("computes offset", () => {
    const p = usePagination({ total: 100, pageSize: 10 });
    expect(p.offset()).toBe(0);
    p.goTo(3);
    expect(p.offset()).toBe(20);
  });

  it("next() advances the page", () => {
    const p = usePagination({ total: 30, pageSize: 10 });
    p.next();
    expect(p.page()).toBe(2);
  });

  it("next() does nothing on last page", () => {
    const p = usePagination({ total: 10, pageSize: 10 });
    p.next();
    expect(p.page()).toBe(1);
  });

  it("prev() goes back", () => {
    const p = usePagination({ total: 30, pageSize: 10, initial: 3 });
    p.prev();
    expect(p.page()).toBe(2);
  });

  it("prev() does nothing on first page", () => {
    const p = usePagination({ total: 30, pageSize: 10 });
    p.prev();
    expect(p.page()).toBe(1);
  });

  it("goTo() clamps to valid range", () => {
    const p = usePagination({ total: 30, pageSize: 10 });
    p.goTo(0);
    expect(p.page()).toBe(1);
    p.goTo(99);
    expect(p.page()).toBe(3);
  });

  it("first() jumps to page 1", () => {
    const p = usePagination({ total: 50, pageSize: 10, initial: 5 });
    p.first();
    expect(p.page()).toBe(1);
  });

  it("last() jumps to last page", () => {
    const p = usePagination({ total: 50, pageSize: 10 });
    p.last();
    expect(p.page()).toBe(5);
  });

  it("hasNext is false on last page", () => {
    const p = usePagination({ total: 10, pageSize: 10 });
    expect(p.hasNext()).toBe(false);
  });

  it("hasPrev is false on first page", () => {
    const p = usePagination({ total: 30, pageSize: 10 });
    expect(p.hasPrev()).toBe(false);
  });

  it("pages() returns array of page numbers", () => {
    const p = usePagination({ total: 30, pageSize: 10 });
    expect(p.pages()).toEqual([1, 2, 3]);
  });

  it("pageSize() reflects the configured size", () => {
    const p = usePagination({ total: 100, pageSize: 25 });
    expect(p.pageSize()).toBe(25);
  });

  it("accepts a factory function for options", () => {
    const p = usePagination(() => ({ total: 50, pageSize: 5 }));
    expect(p.totalPages()).toBe(10);
  });
});

// ── useClipboard ──────────────────────────────────────────────────────────────

describe("useClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("copied starts as false", () => {
    const { copied } = useClipboard();
    expect(copied()).toBe(false);
  });

  it("content starts as empty string", () => {
    const { content } = useClipboard();
    expect(content()).toBe("");
  });

  it("sets copied to true and content to the text after copy()", async () => {
    const { copy, copied, content } = useClipboard();
    await copy("hello");
    expect(copied()).toBe(true);
    expect(content()).toBe("hello");
  });

  it("resets copied to false after resetDelay", async () => {
    const { copy, copied } = useClipboard(1000);
    await copy("test");
    expect(copied()).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(copied()).toBe(false);
  });

  it("warns and does not update state on clipboard failure", async () => {
    (navigator.clipboard as unknown as { writeText: ReturnType<typeof vi.fn> }).writeText =
      vi.fn().mockRejectedValue(new Error("denied"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { copy, copied } = useClipboard();
    await copy("fail");
    expect(copied()).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ── useGeolocation ────────────────────────────────────────────────────────────

describe("useGeolocation", () => {
  it("starts with loading=true and lat/lng null", () => {
    const successCb: PositionCallback[] = [];
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          successCb.push(success);
        },
      },
      configurable: true,
    });

    const geo = useGeolocation();
    expect(geo.loading()).toBe(true);
    expect(geo.lat()).toBeNull();
    expect(geo.lng()).toBeNull();
  });

  it("updates lat/lng/loading on success", () => {
    let successCb: PositionCallback | null = null;
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          successCb = success;
        },
      },
      configurable: true,
    });

    const geo = useGeolocation();

    successCb!({
      coords: { latitude: 10.5, longitude: 20.5 } as GeolocationCoordinates,
    } as GeolocationPosition);

    expect(geo.lat()).toBe(10.5);
    expect(geo.lng()).toBe(20.5);
    expect(geo.loading()).toBe(false);
  });

  it("sets error and loading=false on failure", () => {
    let errorCb: PositionErrorCallback | null = null;
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (_s: PositionCallback, error: PositionErrorCallback) => {
          errorCb = error;
        },
      },
      configurable: true,
    });

    const geo = useGeolocation();
    const fakeError = { code: 1, message: "denied" } as GeolocationPositionError;
    errorCb!(fakeError);

    expect(geo.error()).toBe(fakeError);
    expect(geo.loading()).toBe(false);
  });
});

// ── useTimeAgo ────────────────────────────────────────────────────────────────

describe("useTimeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("returns a computed string", () => {
    const now = Date.now();
    const t = useTimeAgo(() => now);
    expect(typeof t()).toBe("string");
  });

  it("formats seconds ago", () => {
    const now = Date.now();
    const t = useTimeAgo(() => now - 30_000);
    expect(t()).toMatch(/segundo|second/i);
  });

  it("formats minutes ago", () => {
    const now = Date.now();
    const t = useTimeAgo(() => now - 5 * 60_000);
    expect(t()).toMatch(/minuto|minute/i);
  });

  it("formats hours ago", () => {
    const now = Date.now();
    const t = useTimeAgo(() => now - 2 * 3_600_000);
    expect(t()).toMatch(/hora|hour/i);
  });

  it("formats days ago", () => {
    const now = Date.now();
    const t = useTimeAgo(() => now - 3 * 86_400_000);
    expect(t()).toMatch(/dia|day/i);
  });

  it("formats months ago", () => {
    const now = Date.now();
    const t = useTimeAgo(() => now - 60 * 86_400_000);
    expect(t()).toMatch(/mes|month/i);
  });

  it("accepts a signal source", () => {
    const src = signal(Date.now() - 90_000);
    const t = useTimeAgo(src);
    expect(typeof t()).toBe("string");
  });
});
