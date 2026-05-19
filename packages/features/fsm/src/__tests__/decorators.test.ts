import { describe, it, expect, vi } from "vitest";

import { Transition, StateMachine } from "../decorators";
import { createMachine } from "../machine";
import type { Machine } from "../machine";

const TOGGLE_DEF = {
  initial: "off" as const,
  states: {
    off: { on: { toggle: "on" as const } },
    on:  { on: { toggle: "off" as const } },
  },
} as const;

// Helper to simulate TC39 field decorator context
function fieldCtx(name: string) {
  const initializers: Array<(this: object) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: object) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext,
    run(instance: object) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

// Helper to simulate TC39 method decorator context
function mockMethodContext(name: string) {
  const initializers: Array<(this: object) => void> = [];
  return {
    name,
    kind: "method" as const,
    addInitializer(fn: (this: object) => void) { initializers.push(fn); },
    runInitializers(instance: object) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

// ── StateMachine ──────────────────────────────────────────────────────────────

describe("StateMachine decorator", () => {
  it("injects a machine via field decorator", () => {
    const { ctx, run } = fieldCtx("machine");
    StateMachine(TOGGLE_DEF)(undefined, ctx as ClassFieldDecoratorContext<object, Machine<"off"|"on","toggle">>);

    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.machine).toBeDefined();
    expect((instance.machine as Machine<string, string>).state()).toBe("off");
  });

  it("returns a separate machine per instance", () => {
    const { ctx, run } = fieldCtx("machine");
    StateMachine(TOGGLE_DEF)(undefined, ctx as ClassFieldDecoratorContext<object, Machine<"off"|"on","toggle">>);

    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    run(a);
    run(b);
    (a.machine as Machine<string, string>).send("toggle");
    expect((a.machine as Machine<string, string>).state()).toBe("on");
    expect((b.machine as Machine<string, string>).state()).toBe("off");
  });

  it("supports a custom field name", () => {
    const { ctx, run } = fieldCtx("fsm");
    StateMachine(TOGGLE_DEF)(undefined, ctx as ClassFieldDecoratorContext<object, Machine<"off"|"on","toggle">>);

    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.fsm).toBeDefined();
    expect((instance.fsm as Machine<string, string>).state()).toBe("off");
  });

  it("returns the same machine instance on repeated access", () => {
    const { ctx, run } = fieldCtx("machine");
    StateMachine(TOGGLE_DEF)(undefined, ctx as ClassFieldDecoratorContext<object, Machine<"off"|"on","toggle">>);

    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.machine).toBe(instance.machine);
  });
});

// ── Transition ────────────────────────────────────────────────────────────────

describe("Transition decorator", () => {
  it("calls the original method when send succeeds", () => {
    const original = vi.fn(() => "ran");
    const ctx = mockMethodContext("doTransition");
    Transition("machine", "toggle")(original, ctx as unknown as ClassMethodDecoratorContext);

    const instance = { machine: createMachine(TOGGLE_DEF) } as Record<string, unknown>;
    ctx.runInitializers(instance);
    const method = (instance as Record<string, () => unknown>).doTransition;

    method();
    expect(original).toHaveBeenCalled();
  });

  it("returns without calling method when machine is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const original = vi.fn();
    const ctx = mockMethodContext("doTransition");
    Transition("machine", "toggle")(original, ctx as unknown as ClassMethodDecoratorContext);

    const instance = {} as Record<string, unknown>;
    ctx.runInitializers(instance);
    const method = (instance as Record<string, () => unknown>).doTransition;

    method();
    expect(original).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Transition]"));
    warn.mockRestore();
  });

  it("does not call method when transition is invalid", () => {
    const original = vi.fn();
    const ctx = mockMethodContext("doTransition");
    Transition("machine", "toggle")(original, ctx as unknown as ClassMethodDecoratorContext);

    const instance = {
      machine: createMachine({ initial: "on" as const, states: { on: {} } }),
    } as Record<string, unknown>;
    ctx.runInitializers(instance);
    const method = (instance as Record<string, () => unknown>).doTransition;

    method();
    expect(original).not.toHaveBeenCalled();
  });

  it("passes through arguments to the original method", () => {
    const original = vi.fn((_x: unknown) => undefined);
    const ctx = mockMethodContext("doTransition");
    Transition("machine", "toggle")(original, ctx as unknown as ClassMethodDecoratorContext);

    const instance = { machine: createMachine(TOGGLE_DEF) } as Record<string, unknown>;
    ctx.runInitializers(instance);
    const method = (instance as Record<string, (...a: unknown[]) => unknown>).doTransition;

    method(42);
    expect(original).toHaveBeenCalledWith(42);
  });

  it("@Transition on method without @StateMachine — warns and returns undefined", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const original = vi.fn(() => "ran");
    const ctx = mockMethodContext("doTransition");
    Transition("machine", "toggle")(original, ctx as unknown as ClassMethodDecoratorContext);

    const instance = {} as Record<string, unknown>;
    ctx.runInitializers(instance);
    const method = (instance as Record<string, () => unknown>).doTransition;

    const result = method();
    expect(result).toBeUndefined();
    expect(original).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Transition]"));
    warn.mockRestore();
  });
});
