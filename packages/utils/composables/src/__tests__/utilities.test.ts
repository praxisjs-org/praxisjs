// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { signal } from "@praxisjs/core/internal";

import { Clipboard, Geolocation, TimeAgo, Pagination } from "../utilities";

// ── Clipboard ─────────────────────────────────────────────────────────────────

describe("Clipboard", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("starts with copied=false and empty content", () => {
    const cb = new Clipboard();
    const { copied, content } = cb.setup() as { copied: () => boolean; content: () => string };
    expect(copied()).toBe(false);
    expect(content()).toBe("");
  });

  it("sets copied=true and content after copy", async () => {
    const cb = new Clipboard();
    const { copy, copied, content } = cb.setup() as {
      copy: (t: string) => Promise<void>;
      copied: () => boolean;
      content: () => string;
    };
    await copy("hello");
    expect(copied()).toBe(true);
    expect(content()).toBe("hello");
  });

  it("resets copied after resetDelay", async () => {
    vi.useFakeTimers();
    const cb = new Clipboard(1000);
    const { copy, copied } = cb.setup() as {
      copy: (t: string) => Promise<void>;
      copied: () => boolean;
    };
    await copy("test");
    expect(copied()).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(copied()).toBe(false);
    vi.useRealTimers();
  });

  it("warns on clipboard failure", async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("denied"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cb = new Clipboard();
    const { copy } = cb.setup() as { copy: (t: string) => Promise<void> };
    await copy("fail");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("setTimeout is cleared on onUnmount", async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const cb = new Clipboard(1000);
    const { copy } = cb.setup() as { copy: (t: string) => Promise<void> };
    await copy("hello");
    cb.onUnmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

// ── Geolocation ───────────────────────────────────────────────────────────────

describe("Geolocation", () => {
  function mockGeolocation(impl: (success: PositionCallback, error?: PositionErrorCallback | null) => void) {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition: impl },
    });
  }

  afterEach(() => { vi.unstubAllGlobals(); });

  it("starts in loading state", () => {
    mockGeolocation(() => {});
    const geo = new Geolocation();
    const { loading, lat, lng, error } = geo.setup() as {
      loading: () => boolean;
      lat: () => number | null;
      lng: () => number | null;
      error: () => GeolocationPositionError | null;
    };
    expect(loading()).toBe(true);
    expect(lat()).toBeNull();
    expect(lng()).toBeNull();
    expect(error()).toBeNull();
  });

  it("sets coordinates on success", () => {
    mockGeolocation((success) => {
      success({ coords: { latitude: 51.5, longitude: -0.1 } } as GeolocationPosition);
    });
    const geo = new Geolocation();
    const { loading, lat, lng } = geo.setup() as {
      loading: () => boolean;
      lat: () => number | null;
      lng: () => number | null;
    };
    expect(loading()).toBe(false);
    expect(lat()).toBe(51.5);
    expect(lng()).toBe(-0.1);
  });

  it("sets error on failure", () => {
    const mockError = { code: 1, message: "denied" } as GeolocationPositionError;
    mockGeolocation((_s, error) => { error!(mockError); });
    const geo = new Geolocation();
    const { loading, error } = geo.setup() as {
      loading: () => boolean;
      error: () => GeolocationPositionError | null;
    };
    expect(loading()).toBe(false);
    expect(error()).toBe(mockError);
  });

  it("success callback after unmount does not update state", () => {
    let capturedSuccess: PositionCallback | undefined;
    mockGeolocation((success) => { capturedSuccess = success; });

    const geo = new Geolocation();
    const { lat, lng, loading } = geo.setup() as {
      lat: () => number | null;
      lng: () => number | null;
      loading: () => boolean;
    };

    geo.onUnmount();
    capturedSuccess!({ coords: { latitude: 99, longitude: 99 } } as GeolocationPosition);

    expect(lat()).toBeNull();
    expect(lng()).toBeNull();
    expect(loading()).toBe(true);
  });

  it("error callback after unmount does not update state", () => {
    let capturedError: PositionErrorCallback | undefined;
    mockGeolocation((_success, error) => { capturedError = error ?? undefined; });

    const geo = new Geolocation();
    const { error, loading } = geo.setup() as {
      error: () => GeolocationPositionError | null;
      loading: () => boolean;
    };

    geo.onUnmount();
    capturedError!({ code: 1, message: "denied" } as GeolocationPositionError);

    expect(error()).toBeNull();
    expect(loading()).toBe(true);
  });
});

// ── TimeAgo ───────────────────────────────────────────────────────────────────

describe("TimeAgo", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const now = Date.now();

  it("formats seconds ago", () => {
    const ta = new TimeAgo(() => now - 30_000, "en");
    const { value } = ta.setup() as { value: () => string };
    expect(value()).toContain("30 seconds ago");
  });

  it("formats minutes ago", () => {
    const ta = new TimeAgo(() => now - 5 * 60_000, "en");
    const { value } = ta.setup() as { value: () => string };
    expect(value()).toContain("5 minutes ago");
  });

  it("formats hours ago", () => {
    const ta = new TimeAgo(() => now - 2 * 3_600_000, "en");
    const { value } = ta.setup() as { value: () => string };
    expect(value()).toContain("2 hours ago");
  });

  it("formats days ago", () => {
    const ta = new TimeAgo(() => now - 3 * 86_400_000, "en");
    const { value } = ta.setup() as { value: () => string };
    expect(value()).toContain("3 days ago");
  });

  it("formats months ago", () => {
    const ta = new TimeAgo(() => now - 60 * 86_400_000, "en");
    const { value } = ta.setup() as { value: () => string };
    expect(value()).toContain("2 months ago");
  });

  it("accepts a signal as source", () => {
    const src = signal(now - 30_000);
    const ta = new TimeAgo(src, "en");
    const { value } = ta.setup() as { value: () => string };
    expect(value()).toContain("30 seconds ago");
  });

  it("clears interval on unmount", () => {
    const clearInterval = vi.spyOn(globalThis, "clearInterval");
    const ta = new TimeAgo(() => now, "en");
    ta.setup();
    ta.onUnmount();
    expect(clearInterval).toHaveBeenCalled();
  });

  it("future date produces a positive relative time string (e.g. 'in 30 seconds')", () => {
    // A future timestamp produces a positive diff; Intl.RelativeTimeFormat formats it as "in X"
    const ta = new TimeAgo(() => now + 30_000, "en");
    const { value } = ta.setup() as { value: () => string };
    expect(value()).toContain("in 30 seconds");
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe("Pagination", () => {
  it("initialises with defaults", () => {
    const p = new Pagination({ total: 100, pageSize: 10 });
    const s = p.setup() as {
      page: () => number; totalPages: () => number; offset: () => number;
      hasNext: () => boolean; hasPrev: () => boolean; pageSize: () => number;
    };
    expect(s.page()).toBe(1);
    expect(s.totalPages()).toBe(10);
    expect(s.offset()).toBe(0);
    expect(s.hasNext()).toBe(true);
    expect(s.hasPrev()).toBe(false);
    expect(s.pageSize()).toBe(10);
  });

  it("respects initial page", () => {
    const p = new Pagination({ total: 100, pageSize: 10, initial: 3 });
    const { page, offset } = p.setup() as { page: () => number; offset: () => number };
    expect(page()).toBe(3);
    expect(offset()).toBe(20);
  });

  it("next() advances page", () => {
    const p = new Pagination({ total: 30, pageSize: 10 });
    const { page, next } = p.setup() as { page: () => number; next: () => void };
    (next as () => void)();
    expect(page()).toBe(2);
  });

  it("prev() goes back a page", () => {
    const p = new Pagination({ total: 30, pageSize: 10, initial: 3 });
    const { page, prev } = p.setup() as { page: () => number; prev: () => void };
    (prev as () => void)();
    expect(page()).toBe(2);
  });

  it("next() does not go past last page", () => {
    const p = new Pagination({ total: 10, pageSize: 10 });
    const { page, next } = p.setup() as { page: () => number; next: () => void };
    (next as () => void)();
    expect(page()).toBe(1);
  });

  it("prev() does not go before first page", () => {
    const p = new Pagination({ total: 30, pageSize: 10 });
    const { page, prev } = p.setup() as { page: () => number; prev: () => void };
    (prev as () => void)();
    expect(page()).toBe(1);
  });

  it("goTo() jumps to a page", () => {
    const p = new Pagination({ total: 50, pageSize: 10 });
    const { page, goTo } = p.setup() as { page: () => number; goTo: (n: number) => void };
    (goTo as (n: number) => void)(4);
    expect(page()).toBe(4);
  });

  it("first() jumps to page 1", () => {
    const p = new Pagination({ total: 50, pageSize: 10, initial: 5 });
    const { page, first } = p.setup() as { page: () => number; first: () => void };
    (first as () => void)();
    expect(page()).toBe(1);
  });

  it("last() jumps to last page", () => {
    const p = new Pagination({ total: 50, pageSize: 10 });
    const { page, last } = p.setup() as { page: () => number; last: () => void };
    (last as () => void)();
    expect(page()).toBe(5);
  });

  it("pages() returns array of page numbers", () => {
    const p = new Pagination({ total: 30, pageSize: 10 });
    const { pages } = p.setup() as { pages: () => number[] };
    expect((pages as () => number[])()).toEqual([1, 2, 3]);
  });

  it("clamps totalPages for fractional divisions", () => {
    const p = new Pagination({ total: 25, pageSize: 10 });
    const { totalPages } = p.setup() as { totalPages: () => number };
    expect(totalPages()).toBe(3);
  });

  it("throws when pageSize is 0", () => {
    expect(() => new Pagination({ total: 10, pageSize: 0 })).toThrow("pageSize must be greater than 0");
  });

  it("throws when pageSize is negative", () => {
    expect(() => new Pagination({ total: 10, pageSize: -1 })).toThrow("pageSize must be greater than 0");
  });
});
