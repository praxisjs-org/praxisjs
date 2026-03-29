// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { Tween, Spring } from "../decorators";

function makeCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

// ── @Tween ────────────────────────────────────────────────────────────────────

describe("@Tween", () => {
  it("returns 0 before any value is set", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("opacity");
    Tween()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.opacity).toBe(0);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("creates a numeric getter/setter on first assignment", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("x");
    Tween()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    instance.x = 10;
    expect(typeof instance.x).toBe("number");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("updating the property updates the tween target", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("scale");
    Tween()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    instance.scale = 1;
    instance.scale = 2;
    expect(typeof instance.scale).toBe("number");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("accepts TweenOptions", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("y");
    Tween({ duration: 500, easing: "linear", delay: 50 })(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    instance.y = 100;
    expect(typeof instance.y).toBe("number");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("each instance gets its own tween", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("val");
    Tween()(undefined, ctx);
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    run(a);
    run(b);
    a.val = 10;
    b.val = 50;
    expect(a.val).not.toBe(b.val);
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

// ── @Spring ───────────────────────────────────────────────────────────────────

describe("@Spring", () => {
  it("returns 0 before any value is set", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("x");
    Spring()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.x).toBe(0);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("creates a numeric getter/setter on first assignment", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("y");
    Spring()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    instance.y = 42;
    expect(typeof instance.y).toBe("number");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("updating the property sets the spring target", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("scale");
    Spring()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    instance.scale = 1;
    instance.scale = 2;
    expect(typeof instance.scale).toBe("number");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("accepts SpringOptions", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("opacity");
    Spring({ stiffness: 0.3, damping: 0.9, mass: 2 })(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    instance.opacity = 1;
    expect(typeof instance.opacity).toBe("number");
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("each instance gets its own spring", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("val");
    Spring()(undefined, ctx);
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    run(a);
    run(b);
    a.val = 10;
    b.val = 50;
    expect(a.val).not.toBe(b.val);
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

// ── Edge case tests ───────────────────────────────────────────────────────────

describe("@Tween edge cases", () => {
  it("setting NaN on @Tween field does not crash", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("opacity");
    Tween()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(() => { instance.opacity = NaN; }).not.toThrow();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("two @Tween fields on same class — independent animations", () => {
    vi.useFakeTimers();
    const { ctx: ctxX, run: runX } = makeCtx("x");
    const { ctx: ctxY, run: runY } = makeCtx("y");
    Tween()(undefined, ctxX);
    Tween()(undefined, ctxY);
    const instance: Record<string, unknown> = {};
    runX(instance);
    runY(instance);
    instance.x = 10;
    instance.y = 50;
    expect(instance.x).not.toBe(instance.y);
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});

describe("@Spring edge cases", () => {
  it("setting Infinity on @Spring field does not crash", () => {
    vi.useFakeTimers();
    const { ctx, run } = makeCtx("scale");
    Spring()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(() => { instance.scale = Infinity; }).not.toThrow();
    vi.clearAllTimers();
    vi.useRealTimers();
  });
});
