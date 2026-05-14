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
