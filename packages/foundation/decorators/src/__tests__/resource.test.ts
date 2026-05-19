import { describe, it, expect, vi, beforeEach } from "vitest";

import { invalidateResource, _clearCache } from "@praxisjs/core/internal";

import { Resource } from "../properties/resource";

function makeFieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) { initializers.forEach((fn) => { fn.call(instance); }); },
  };
}

describe("@Resource", () => {
  it("binds a Resource object to the field", () => {
    const { ctx, run } = makeFieldCtx("users");
    Resource(() => Promise.resolve([]))(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.users as Record<string, unknown>;
    expect(typeof r.data).toBe("function");
    expect(typeof r.pending).toBe("function");
    expect(typeof r.error).toBe("function");
    expect(typeof r.status).toBe("function");
    expect(typeof r.refetch).toBe("function");
    expect(typeof r.cancel).toBe("function");
    expect(typeof r.mutate).toBe("function");
  });

  it("starts in pending state when immediate=true (default)", () => {
    const { ctx, run } = makeFieldCtx("data");
    Resource(() => new Promise(() => {}))(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.data as { pending: () => boolean; status: () => string };
    expect(r.pending()).toBe(true);
    expect(r.status()).toBe("pending");
  });

  it("starts idle when immediate=false", () => {
    const { ctx, run } = makeFieldCtx("data");
    Resource(() => Promise.resolve(42), { immediate: false })(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.data as { status: () => string; pending: () => boolean };
    expect(r.status()).toBe("idle");
    expect(r.pending()).toBe(false);
  });

  it("resolves data asynchronously", async () => {
    const { ctx, run } = makeFieldCtx("items");
    Resource(() => Promise.resolve([1, 2, 3]))(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.items as { data: () => unknown; status: () => string };
    await vi.waitFor(() => r.status() === "success");
    expect(r.data()).toEqual([1, 2, 3]);
  });

  it("sets error state on rejection", async () => {
    const { ctx, run } = makeFieldCtx("items");
    Resource(() => Promise.reject(new Error("fetch failed")))(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.items as { error: () => Error | null; status: () => string };
    await new Promise((res) => setTimeout(res, 0));
    expect(r.status()).toBe("error");
    expect((r.error() as Error).message).toBe("fetch failed");
  });

  it("each instance gets its own resource", () => {
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve(0))(undefined, ctx);
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    run(a);
    run(b);
    expect(a.r).not.toBe(b.r);
  });

  it("mutate() updates data immediately", async () => {
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve(1))(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.r as { mutate: (v: number) => void; data: () => number; status: () => string };
    r.mutate(99);
    expect(r.data()).toBe(99);
    expect(r.status()).toBe("success");
  });

  it("cancel() stops a pending fetch", async () => {
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => new Promise(() => {}))(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.r as { cancel: () => void; status: () => string };
    r.cancel();
    expect(r.status()).toBe("idle");
  });

  it("uses initialData option", () => {
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve("new"), { initialData: "default", immediate: false })(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.r as { data: () => string };
    expect(r.data()).toBe("default");
  });

  it("cancel() called when not pending — no-op, no crash", () => {
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve(42), { immediate: false })(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.r as { cancel: () => void; status: () => string };
    // Not pending (immediate=false → idle)
    expect(r.status()).toBe("idle");
    expect(() => r.cancel()).not.toThrow();
    expect(r.status()).toBe("idle");
  });

  it("refetch() called after successful load — re-fetches", async () => {
    let callCount = 0;
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve(++callCount))(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const r = instance.r as { refetch: () => void; data: () => number; status: () => string };

    await vi.waitFor(() => r.status() === "success");
    expect(r.data()).toBe(1);

    r.refetch();
    await vi.waitFor(() => r.status() === "success" && r.data() === 2);
    expect(callCount).toBe(2);
  });

  it("passes instance as self when fetcher has arity > 0", async () => {
    const { ctx, run } = makeFieldCtx("r");
    const fetcher = vi.fn((self: Record<string, unknown>) =>
      Promise.resolve(self.value as number),
    );
    Resource(fetcher)(undefined, ctx);
    const inst: Record<string, unknown> = { value: 42 };
    run(inst);
    const r = inst.r as { status: () => string; data: () => number };
    await vi.waitFor(() => r.status() === "success");
    expect(r.data()).toBe(42);
    expect(fetcher).toHaveBeenCalledWith(inst);
  });

  it("setter is a no-op — assigning to the decorated field has no effect", () => {
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve(42), { immediate: false })(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const original = instance.r;
    instance.r = "overwrite-attempt"; // triggers set(): void {} (no-op)
    expect(instance.r).toBe(original);
  });

  it("onUnmount calls destroy() on the resource", async () => {
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve(1))(undefined, ctx);
    const inst: Record<string, unknown> = {};
    run(inst);
    const r = inst.r as { destroy: () => void };
    const spy = vi.spyOn(r, "destroy");
    (inst as { onUnmount?: () => void }).onUnmount?.();
    expect(spy).toHaveBeenCalledOnce();
  });
});

describe("@Resource — cache / SWR / invalidation", () => {
  beforeEach(() => { _clearCache(); });

  function makeFieldCtx(name: string) {
    const initializers: Array<(this: unknown) => void> = [];
    return {
      ctx: {
        name,
        kind: "field" as const,
        addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
      } as ClassFieldDecoratorContext,
      run(instance: unknown) { initializers.forEach((fn) => { fn.call(instance); }); },
    };
  }

  it("key: serves stale cached data immediately while refetching (SWR)", async () => {
    const { ctx: ctx1, run: run1 } = makeFieldCtx("r1");
    Resource(() => Promise.resolve("first"), { key: "dec-swr" })(undefined, ctx1);
    const inst1: Record<string, unknown> = {};
    run1(inst1);
    const r1 = inst1.r1 as { status: () => string; data: () => string; destroy: () => void };
    await vi.waitFor(() => r1.status() === "success");

    // Second decorator instance — should see cached data straight away
    const { ctx: ctx2, run: run2 } = makeFieldCtx("r2");
    Resource(() => Promise.resolve("second"), { key: "dec-swr" })(undefined, ctx2);
    const inst2: Record<string, unknown> = {};
    run2(inst2);
    const r2 = inst2.r2 as { status: () => string; data: () => string; destroy: () => void };

    expect(r2.data()).toBe("first"); // stale data shown immediately
    await vi.waitFor(() => r2.data() === "second");
    r1.destroy();
    r2.destroy();
  });

  it("invalidateResource() triggers refetch on decorated field", async () => {
    let call = 0;
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve(++call), { key: "dec-inv" })(undefined, ctx);
    const inst: Record<string, unknown> = {};
    run(inst);
    const r = inst.r as { status: () => string; data: () => number; destroy: () => void };
    await vi.waitFor(() => r.status() === "success");
    expect(r.data()).toBe(1);

    invalidateResource("dec-inv");
    await vi.waitFor(() => r.data() === 2);
    r.destroy();
  });

  it("destroy() via onUnmount unregisters from cache — no refetch after unmount", async () => {
    let call = 0;
    const { ctx, run } = makeFieldCtx("r");
    Resource(() => Promise.resolve(++call), { key: "dec-unreg" })(undefined, ctx);
    const inst: Record<string, unknown> = {};
    run(inst);
    const r = inst.r as { status: () => string; data: () => number; destroy: () => void };
    await vi.waitFor(() => r.status() === "success");

    r.destroy();
    const before = call;
    invalidateResource("dec-unreg");
    await new Promise((res) => setTimeout(res, 10));
    expect(call).toBe(before);
  });
});
