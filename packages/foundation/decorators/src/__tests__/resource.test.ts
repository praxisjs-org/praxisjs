import { describe, it, expect, vi } from "vitest";

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
});
