import { describe, it, expect, vi, beforeEach } from "vitest";

import { resource, createResource } from "../async/resource";
import { invalidateResource, _clearCache } from "../async/resource-cache";
import { signal } from "../signal/signal";

describe("resource", () => {
  it("starts as pending and resolves to success", async () => {
    const r = resource(() => Promise.resolve("hello"));
    expect(r.status()).toBe("pending");
    await vi.waitFor(() => r.status() === "success");
    expect(r.data()).toBe("hello");
    expect(r.pending()).toBe(false);
    expect(r.error()).toBeNull();
  });

  it("transitions to error on rejection", async () => {
    const r = resource(() => Promise.reject(new Error("oops")));
    await new Promise((res) => setTimeout(res, 0));
    expect(r.status()).toBe("error");
    expect((r.error() as Error).message).toBe("oops");
    expect(r.data()).toBeNull();
  });

  it("wraps non-Error rejections in Error", async () => {
    const r = resource(() => Promise.reject("plain string"));
    await new Promise((res) => setTimeout(res, 0));
    expect(r.status()).toBe("error");
    expect(r.error()).toBeInstanceOf(Error);
  });

  it("immediate=false does not fetch on creation", () => {
    const fetcher = vi.fn(() => Promise.resolve(1));
    const r = resource(fetcher, { immediate: false });
    expect(fetcher).not.toHaveBeenCalled();
    expect(r.status()).toBe("idle");
  });

  it("refetch() re-runs the fetcher", async () => {
    let count = 0;
    const r = resource(() => Promise.resolve(++count));
    await vi.waitFor(() => r.status() === "success");
    expect(r.data()).toBe(1);
    r.refetch();
    await vi.waitFor(() => r.data() === 2);
    expect(r.data()).toBe(2);
  });

  it("cancel() sets status back to idle and ignores in-flight result", async () => {
    let resolve!: (v: number) => void;
    const r = resource(() => new Promise<number>((res) => { resolve = res; }));
    r.cancel();
    expect(r.status()).toBe("idle");
    resolve(99);
    await new Promise((r) => setTimeout(r, 10));
    expect(r.data()).toBeNull(); // stale result ignored
  });

  it("mutate() sets data directly", async () => {
    const r = resource(() => Promise.resolve(1));
    await vi.waitFor(() => r.status() === "success");
    r.mutate(999);
    expect(r.data()).toBe(999);
    expect(r.status()).toBe("success");
    expect(r.error()).toBeNull();
  });

  it("initialData is visible when immediate=false", () => {
    const r = resource(
      () => new Promise<string>(() => {}),
      { initialData: "cached", immediate: false },
    );
    expect(r.data()).toBe("cached");
    expect(r.status()).toBe("idle");
  });

  it("cancel() before rejection ignores the stale error (catch stale path)", async () => {
    let reject!: (e: Error) => void;
    const r = resource(
      () => new Promise<number>((_res, rej) => { reject = rej; }),
    );
    r.cancel();
    expect(r.status()).toBe("idle");
    reject(new Error("cancelled error"));
    await new Promise((res) => setTimeout(res, 10));
    expect(r.status()).toBe("idle");
    expect(r.error()).toBeNull();
  });

  it("keepPreviousData=true preserves old data during refetch", async () => {
    let call = 0;
    const r = resource(() => Promise.resolve(++call), { keepPreviousData: true });
    await vi.waitFor(() => r.data() === 1);
    r.refetch();
    // data should still be 1 while pending
    expect(r.data()).toBe(1);
    await vi.waitFor(() => r.data() === 2);
  });
});

describe("createResource", () => {
  it("re-fetches when the param signal changes", async () => {
    const id = signal(1);
    const fetcher = vi.fn((n: number) => Promise.resolve(n * 10));
    const r = createResource(id, fetcher);
    await vi.waitFor(() => r.data() === 10);
    id.set(2);
    await vi.waitFor(() => r.data() === 20);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("resource — execute() sync throw via refetch()", () => {
  it("refetch() captures a synchronous throw from the fetcher", async () => {
    const r = resource(() => Promise.resolve(1), { immediate: false });
    let calls = 0;
    const r2 = resource(
      () => {
        calls++;
        if (calls >= 2) throw new Error("sync in refetch");
        return Promise.resolve(1);
      },
      { immediate: false },
    );
    r2.refetch(); // first call succeeds
    await vi.waitFor(() => r2.status() === "success");
    r2.refetch(); // second call throws synchronously
    await vi.waitFor(() => r2.status() === "error");
    expect((r2.error() as Error).message).toBe("sync in refetch");
    void r;
  });

  it("refetch() wraps non-Error sync throws in Error", async () => {
    let calls = 0;
    const r = resource(
      () => {
        calls++;
        if (calls >= 2) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw "plain string sync";
        }
        return Promise.resolve(1);
      },
      { immediate: false },
    );
    r.refetch();
    await vi.waitFor(() => r.status() === "success");
    r.refetch();
    await vi.waitFor(() => r.status() === "error");
    expect(r.error()).toBeInstanceOf(Error);
    expect((r.error() as Error).message).toBe("plain string sync");
  });
});

describe("resource — destroy()", () => {
  it("destroy() stops the reactive effect — signal changes no longer trigger refetch", async () => {
    const id = signal(1);
    const fetcher = vi.fn((n: number) => Promise.resolve(n * 10));
    const r = resource(() => fetcher(id()), { immediate: true });
    await vi.waitFor(() => r.status() === "success");
    expect(fetcher).toHaveBeenCalledTimes(1);

    r.destroy();
    id.set(2);
    await new Promise((res) => setTimeout(res, 10));
    expect(fetcher).toHaveBeenCalledTimes(1); // no re-fetch after destroy
  });

  it("destroy() is idempotent", async () => {
    const r = resource(() => Promise.resolve(1));
    await vi.waitFor(() => r.status() === "success");
    expect(() => { r.destroy(); r.destroy(); }).not.toThrow();
  });
});

describe("resource — cache + SWR (key, staleTime)", () => {
  beforeEach(() => { _clearCache(); });

  it("key: populates data from cache on creation (SWR)", async () => {
    // First resource fills the cache
    const r1 = resource(() => Promise.resolve("cached-value"), { key: "swr-test" });
    await vi.waitFor(() => r1.status() === "success");

    // Second resource with same key starts with cached data immediately
    const r2 = resource(() => Promise.resolve("new-value"), { key: "swr-test" });
    expect(r2.data()).toBe("cached-value"); // stale data shown immediately
    expect(r2.status()).toBe("pending"); // fetching fresh data in background
    await vi.waitFor(() => r2.data() === "new-value");
    r1.destroy();
    r2.destroy();
  });

  it("staleTime: skips fetch when cache is fresh", async () => {
    const fetcher = vi.fn(() => Promise.resolve("fresh"));
    const r1 = resource(fetcher, { key: "fresh-test", staleTime: 60_000 });
    await vi.waitFor(() => r1.status() === "success");
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Second resource within staleTime — no fetch
    const r2 = resource(fetcher, { key: "fresh-test", staleTime: 60_000 });
    expect(r2.data()).toBe("fresh");
    expect(r2.status()).toBe("success");
    await new Promise((res) => setTimeout(res, 10));
    expect(fetcher).toHaveBeenCalledTimes(1); // no second fetch
    r1.destroy();
    r2.destroy();
  });

  it("staleTime: 0 (default) always refetches even with cached data", async () => {
    const fetcher = vi.fn(() => Promise.resolve("v1"));
    const r1 = resource(fetcher, { key: "always-stale" });
    await vi.waitFor(() => r1.status() === "success");

    const r2 = resource(fetcher, { key: "always-stale", staleTime: 0 });
    expect(r2.data()).toBe("v1"); // shows stale immediately
    await vi.waitFor(() => r2.status() === "success");
    expect(fetcher).toHaveBeenCalledTimes(2); // did refetch
    r1.destroy();
    r2.destroy();
  });
});

describe("resource — deduplication", () => {
  beforeEach(() => { _clearCache(); });

  it("two resources with the same key share a single in-flight request", async () => {
    let resolveShared!: (v: string) => void;
    const fetcher = vi.fn(
      () => new Promise<string>((res) => { resolveShared = res; }),
    );

    const r1 = resource(fetcher, { key: "dedup-test" });
    const r2 = resource(fetcher, { key: "dedup-test" });

    expect(fetcher).toHaveBeenCalledTimes(1); // only one fetch started

    resolveShared("shared-result");
    await vi.waitFor(() => r1.status() === "success");
    await vi.waitFor(() => r2.status() === "success");

    expect(r1.data()).toBe("shared-result");
    expect(r2.data()).toBe("shared-result");
    r1.destroy();
    r2.destroy();
  });
});

describe("resource — key + non-Error sync throw in effect", () => {
  beforeEach(() => { _clearCache(); });

  it("key: wraps non-Error sync throw from fetcher inside effect in Error", async () => {
    const r = resource(
      () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "raw string error in keyed effect";
      },
      { key: "non-error-keyed" },
    );
    await vi.waitFor(() => r.status() === "error");
    expect(r.error()).toBeInstanceOf(Error);
    expect((r.error() as Error).message).toBe("raw string error in keyed effect");
    r.destroy();
  });
});

describe("resource — key + rejection / sync-throw", () => {
  beforeEach(() => { _clearCache(); });

  it("key: clears in-flight entry on rejection (catch path)", async () => {
    const r = resource(
      () => Promise.reject(new Error("keyed failure")),
      { key: "reject-test" },
    );
    await new Promise((res) => setTimeout(res, 0));
    expect(r.status()).toBe("error");
    expect((r.error() as Error).message).toBe("keyed failure");
    r.destroy();
  });

  it("key: sync throw inside effect is captured as error", async () => {
    const r = resource(
      () => { throw new Error("sync in keyed effect"); },
      { key: "sync-throw-keyed" },
    );
    await vi.waitFor(() => r.status() === "error");
    expect((r.error() as Error).message).toBe("sync in keyed effect");
    r.destroy();
  });
});

describe("resource — invalidateResource()", () => {
  beforeEach(() => { _clearCache(); });

  it("clears cache and triggers refetch on all registered resources", async () => {
    let call = 0;
    const fetcher = vi.fn(() => Promise.resolve(++call));

    const r1 = resource(fetcher, { key: "inv-test" });
    const r2 = resource(fetcher, { key: "inv-test" });
    await vi.waitFor(() => r1.status() === "success");
    await vi.waitFor(() => r2.status() === "success");

    const callsBefore = fetcher.mock.calls.length;
    invalidateResource("inv-test");

    await vi.waitFor(() => r1.status() === "success" && r1.data() !== callsBefore);
    expect(fetcher.mock.calls.length).toBeGreaterThan(callsBefore);
    r1.destroy();
    r2.destroy();
  });

  it("no-op when key has no registered resources", () => {
    expect(() => { invalidateResource("nonexistent-key"); }).not.toThrow();
  });

  it("unregisters resource on destroy — invalidate no longer triggers it", async () => {
    let call = 0;
    const fetcher = vi.fn(() => Promise.resolve(++call));
    const r = resource(fetcher, { key: "unreg-test" });
    await vi.waitFor(() => r.status() === "success");

    r.destroy();
    const callsBefore = fetcher.mock.calls.length;

    invalidateResource("unreg-test");
    await new Promise((res) => setTimeout(res, 10));
    expect(fetcher.mock.calls.length).toBe(callsBefore); // no refetch after destroy
  });
});

describe("resource — additional cases", () => {
  it("two concurrent refetch() calls — last result wins, stale result is discarded", async () => {
    let resolveFirst!: (v: string) => void;
    let resolveSecond!: (v: string) => void;

    let call = 0;
    const r = resource(
      () => {
        call++;
        if (call === 1) return new Promise<string>((res) => { resolveFirst = res; });
        return new Promise<string>((res) => { resolveSecond = res; });
      },
      { immediate: false },
    );

    r.refetch(); // call 1
    r.refetch(); // call 2 — supersedes call 1

    resolveSecond("second");
    resolveFirst("first"); // stale

    await vi.waitFor(() => r.status() === "success");
    expect(r.data()).toBe("second");
  });

  it("fetcher() throws synchronously — error is captured, does not crash", async () => {
    const r = resource(() => {
      throw new Error("sync throw");
    });
    await vi.waitFor(() => r.status() === "error");
    expect((r.error() as Error).message).toBe("sync throw");
  });

  it("keepPreviousData: true — data is preserved while refetching", async () => {
    let call = 0;
    let resolve!: (v: number) => void;
    const r = resource(
      () => {
        call++;
        if (call === 1) return Promise.resolve(1);
        return new Promise<number>((res) => { resolve = res; });
      },
      { keepPreviousData: true },
    );

    await vi.waitFor(() => r.data() === 1);
    r.refetch();
    // During refetch with keepPreviousData, old data is preserved
    expect(r.data()).toBe(1);
    expect(r.status()).toBe("pending");
    resolve(2);
    await vi.waitFor(() => r.data() === 2);
  });
});
