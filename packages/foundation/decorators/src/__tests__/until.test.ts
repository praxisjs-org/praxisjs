import { describe, it, expect } from "vitest";

import { signal, computed } from "@praxisjs/core/internal";

import { Until } from "../functions/until";

// Simulates TC39 decorator context for a method decorator
function mockMethodContext(name: string) {
  const initializers: Array<(this: object) => void> = [];
  const ctx = {
    name,
    kind: "method" as const,
    addInitializer(fn: (this: object) => void) {
      initializers.push(fn);
    },
    runInitializers(instance: object) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
  return ctx;
}

// ── @Until ────────────────────────────────────────────────────────────────────

describe("Until", () => {
  it("resolves immediately when the signal is already truthy", async () => {
    const s = signal(42);
    const obj: Record<string, unknown> = { count: s };

    const ctx = mockMethodContext("wait");
    Until("count")(() => {}, ctx as unknown as ClassMethodDecoratorContext);
    ctx.runInitializers(obj);

    const result = await (obj.wait as () => Promise<number>)();
    expect(result).toBe(42);
  });

  it("resolves when the signal becomes truthy", async () => {
    const s = signal<number>(0);
    const obj: Record<string, unknown> = { count: s };

    const ctx = mockMethodContext("wait");
    Until("count")(() => {}, ctx as unknown as ClassMethodDecoratorContext);
    ctx.runInitializers(obj);

    const promise = (obj.wait as () => Promise<number>)();
    s.set(5);
    expect(await promise).toBe(5);
  });

  it("resolves with a computed signal", async () => {
    const s = signal(0);
    const doubled = computed(() => s() * 2);
    const obj: Record<string, unknown> = { doubled };

    const ctx = mockMethodContext("waitDoubled");
    Until("doubled")(() => {}, ctx as unknown as ClassMethodDecoratorContext);
    ctx.runInitializers(obj);

    const promise = (obj.waitDoubled as () => Promise<number>)();
    s.set(3); // doubled becomes 6 (truthy)
    expect(await promise).toBe(6);
  });

  it("each call returns a new promise", async () => {
    const s = signal<string>("");
    const obj: Record<string, unknown> = { name: s };

    const ctx = mockMethodContext("waitName");
    Until("name")(() => {}, ctx as unknown as ClassMethodDecoratorContext);
    ctx.runInitializers(obj);

    const wait = obj.waitName as () => Promise<string>;

    const p1 = wait();
    const p2 = wait();
    expect(p1).not.toBe(p2);

    s.set("alice");
    expect(await p1).toBe("alice");
    expect(await p2).toBe("alice");
  });

  it("does not resolve when signal stays falsy", async () => {
    const s = signal<number>(0);
    const obj: Record<string, unknown> = { count: s };

    const ctx = mockMethodContext("wait");
    Until("count")(() => {}, ctx as unknown as ClassMethodDecoratorContext);
    ctx.runInitializers(obj);

    let resolved = false;
    (obj.wait as () => Promise<number>)().then(() => { resolved = true; });

    await new Promise((res) => { setTimeout(res, 10); });
    expect(resolved).toBe(false);
  });

  it("ignores the original method body", async () => {
    const s = signal("hello");
    const obj: Record<string, unknown> = { value: s };

    let bodyCalled = false;
    const original = () => { bodyCalled = true; };

    const ctx = mockMethodContext("wait");
    Until("value")(original, ctx as unknown as ClassMethodDecoratorContext);
    ctx.runInitializers(obj);

    await (obj.wait as () => Promise<string>)();
    expect(bodyCalled).toBe(false);
  });
});
