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

// ── StateMachine ──────────────────────────────────────────────────────────────

describe("StateMachine decorator", () => {
  it("adds a machine property via prototype", () => {
    class Light {}
    StateMachine(TOGGLE_DEF)(Light, {} as ClassDecoratorContext);
    const instance = new Light() as Record<string, unknown>;
    expect(instance.machine).toBeDefined();
    expect((instance.machine as ReturnType<typeof createMachine>).state()).toBe("off");
  });

  it("returns a separate machine per instance", () => {
    class Bulb {}
    StateMachine(TOGGLE_DEF)(Bulb, {} as ClassDecoratorContext);
    const a = new Bulb() as Record<string, unknown>;
    const b = new Bulb() as Record<string, unknown>;
    (a.machine as ReturnType<typeof createMachine>).send("toggle");
    expect((a.machine as ReturnType<typeof createMachine>).state()).toBe("on");
    expect((b.machine as ReturnType<typeof createMachine>).state()).toBe("off");
  });

  it("uses a custom property key", () => {
    class Widget {}
    StateMachine(TOGGLE_DEF, "fsm")(Widget, {} as ClassDecoratorContext);
    const instance = new Widget() as Record<string, unknown>;
    expect(instance.fsm).toBeDefined();
  });

  it("returns the same instance on repeated access", () => {
    class Btn {}
    StateMachine(TOGGLE_DEF)(Btn, {} as ClassDecoratorContext);
    const instance = new Btn() as Record<string, unknown>;
    expect(instance.machine).toBe(instance.machine);
  });
});

// ── Transition ────────────────────────────────────────────────────────────────

describe("Transition decorator", () => {
  it("calls the original method when send succeeds", () => {
    const original = vi.fn(() => "ran");
    const wrapped = Transition("machine", "toggle")(
      original,
      {} as ClassMethodDecoratorContext,
    );
    const instance = {
      machine: createMachine(TOGGLE_DEF),
    } as Record<string, unknown>;
    wrapped.call(instance);
    expect(original).toHaveBeenCalled();
  });

  it("returns without calling method when machine is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const original = vi.fn();
    const wrapped = Transition("machine", "toggle")(
      original,
      {} as ClassMethodDecoratorContext,
    );
    wrapped.call({} as Record<string, unknown>);
    expect(original).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Transition]"));
    warn.mockRestore();
  });

  it("does not call method when transition is invalid", () => {
    const original = vi.fn();
    const wrapped = Transition("machine", "toggle")(
      original,
      {} as ClassMethodDecoratorContext,
    );
    const instance = {
      machine: createMachine({ initial: "on" as const, states: { on: {} } }),
    } as Record<string, unknown>;
    // "toggle" is not a valid event from "on" state
    wrapped.call(instance);
    expect(original).not.toHaveBeenCalled();
  });

  it("passes through arguments to the original method", () => {
    const original = vi.fn((_x: unknown) => undefined);
    const wrapped = Transition("machine", "toggle")(
      original,
      {} as ClassMethodDecoratorContext,
    );
    const instance = { machine: createMachine(TOGGLE_DEF) } as Record<string, unknown>;
    wrapped.call(instance, 42);
    expect(original).toHaveBeenCalledWith(42);
  });
});
