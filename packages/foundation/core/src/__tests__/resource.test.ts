import { describe, it, expect, vi } from "vitest";

import { resource, createResource } from "../async/resource";
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
