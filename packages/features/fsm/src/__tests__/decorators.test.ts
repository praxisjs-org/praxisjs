import { describe, it, expect, vi } from "vitest";

import { Transition, StateMachine } from "../decorators";
import { createMachine } from "../machine";

const TOGGLE_DEF = {
  initial: "off" as const,
  states: {
    off: { on: { toggle: "on" as const } },
    on: { on: { toggle: "off" as const } },
  },
} as const;

// Helper to simulate TC39 method decorator context
function mockMethodContext(name: string) {
  const initializers: Array<(this: object) => void> = [];
  return {
    name,
    kind: "method" as const,
    addInitializer(fn: (this: object) => void) {
      initializers.push(fn);
    },
    runInitializers(instance: object) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

// ── StateMachine ──────────────────────────────────────────────────────────────

describe("StateMachine decorator", () => {
  it("adds a machine property via prototype", () => {
    class Light {}
    const Wrapped = StateMachine(TOGGLE_DEF)(Light, {} as ClassDecoratorContext) as unknown as typeof Light;
    const instance = new Wrapped() as Record<string, unknown>;
    expect(instance.machine).toBeDefined();
    expect((instance.machine as ReturnType<typeof createMachine>).state()).toBe("off");
  });

  it("returns a separate machine per instance", () => {
    class Bulb {}
    const Wrapped = StateMachine(TOGGLE_DEF)(Bulb, {} as ClassDecoratorContext) as unknown as typeof Bulb;
    const a = new Wrapped() as Record<string, unknown>;
    const b = new Wrapped() as Record<string, unknown>;
    (a.machine as ReturnType<typeof createMachine>).send("toggle");
    expect((a.machine as ReturnType<typeof createMachine>).state()).toBe("on");
    expect((b.machine as ReturnType<typeof createMachine>).state()).toBe("off");
  });

  it("uses a custom property key", () => {
    class Widget {}
    const Wrapped = StateMachine(TOGGLE_DEF, "fsm")(Widget, {} as ClassDecoratorContext) as unknown as typeof Widget;
    const instance = new Wrapped() as Record<string, unknown>;
    expect(instance.fsm).toBeDefined();
  });

  it("returns the same instance on repeated access", () => {
    class Btn {}
    const Wrapped = StateMachine(TOGGLE_DEF)(Btn, {} as ClassDecoratorContext) as unknown as typeof Btn;
    const instance = new Wrapped() as Record<string, unknown>;
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

    // "toggle" is not a valid event from "on" state
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

  it("@Transition on method in class without @StateMachine — warns and returns undefined", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const original = vi.fn(() => "ran");
    const ctx = mockMethodContext("doTransition");
    Transition("machine", "toggle")(original, ctx as unknown as ClassMethodDecoratorContext);

    // Instance has no "machine" property at all
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

// ── StateMachine on subclass ───────────────────────────────────────────────────

describe("StateMachine decorator on subclass", () => {
  it("machine is accessible on subclass instance", () => {
    class Base {}
    class Child extends Base {}
    const Wrapped = StateMachine(TOGGLE_DEF)(Child, {} as ClassDecoratorContext) as unknown as typeof Child;
    const instance = new Wrapped() as Record<string, unknown>;
    expect(instance.machine).toBeDefined();
    expect((instance.machine as ReturnType<typeof createMachine>).state()).toBe("off");
  });

  it("instances of the decorated subclass are isolated", () => {
    class Base {}
    class Child extends Base {}
    const Wrapped = StateMachine(TOGGLE_DEF)(Child, {} as ClassDecoratorContext) as unknown as typeof Child;
    const a = new Wrapped() as Record<string, unknown>;
    const b = new Wrapped() as Record<string, unknown>;
    (a.machine as ReturnType<typeof createMachine>).send("toggle");
    expect((a.machine as ReturnType<typeof createMachine>).state()).toBe("on");
    expect((b.machine as ReturnType<typeof createMachine>).state()).toBe("off");
  });
});
