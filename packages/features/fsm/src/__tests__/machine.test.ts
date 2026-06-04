import { describe, it, expect, vi } from "vitest";

import { createMachine } from "../machine";

type TrafficState = "red" | "green" | "yellow";
type TrafficEvent = "GO" | "SLOW" | "STOP";

function trafficLight() {
  return createMachine<TrafficState, TrafficEvent>({
    initial: "red",
    states: {
      red: { on: { GO: "green" } },
      green: { on: { SLOW: "yellow" } },
      yellow: { on: { STOP: "red" } },
    },
  });
}

describe("createMachine", () => {
  it("initializes in the given state", () => {
    const m = trafficLight();
    expect(m.state()).toBe("red");
  });

  it("transitions on a valid event", () => {
    const m = trafficLight();
    m.send("GO");
    expect(m.state()).toBe("green");
  });

  it("returns true from send() on valid transition", () => {
    const m = trafficLight();
    expect(m.send("GO")).toBe(true);
  });

  it("returns false from send() on invalid event", () => {
    const m = trafficLight();
    expect(m.send("SLOW")).toBe(false); // SLOW is not valid in red
  });

  it("does not change state on invalid event", () => {
    const m = trafficLight();
    m.send("STOP"); // invalid in red
    expect(m.state()).toBe("red");
  });

  it("can() returns true for valid events", () => {
    const m = trafficLight();
    expect(m.can("GO")).toBe(true);
  });

  it("can() returns false for invalid events", () => {
    const m = trafficLight();
    expect(m.can("SLOW")).toBe(false);
  });

  it("is() checks current state", () => {
    const m = trafficLight();
    expect(m.is("red")).toBe(true);
    expect(m.is("green")).toBe(false);
  });

  it("tracks history of transitions", () => {
    const m = trafficLight();
    m.send("GO");
    m.send("SLOW");
    const h = m.history();
    expect(h).toHaveLength(2);
    expect(h[0]).toEqual({ from: "red", event: "GO", to: "green" });
    expect(h[1]).toEqual({ from: "green", event: "SLOW", to: "yellow" });
  });

  it("resets to initial state and clears history", () => {
    const m = trafficLight();
    m.send("GO");
    m.send("SLOW");
    m.reset();
    expect(m.state()).toBe("red");
    expect(m.history()).toHaveLength(0);
  });

  it("calls onEnter on entering a state", () => {
    const onEnter = vi.fn();
    const m = createMachine<"idle" | "active", "START">({
      initial: "idle",
      states: {
        idle: { on: { START: "active" } },
        active: { onEnter },
      },
    });
    m.send("START");
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("calls onExit on leaving a state", () => {
    const onExit = vi.fn();
    const m = createMachine<"idle" | "active", "START">({
      initial: "idle",
      states: {
        idle: { on: { START: "active" }, onExit },
        active: {},
      },
    });
    m.send("START");
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("onExit throwing prevents the state change and keeps history clean", () => {
    const m = createMachine<"idle" | "active", "START">({
      initial: "idle",
      states: {
        idle: {
          on: { START: "active" },
          onExit: () => { throw new Error("exit failed"); },
        },
        active: {},
      },
    });
    expect(() => m.send("START")).toThrow("exit failed");
    expect(m.state()).toBe("idle");
    expect(m.history()).toHaveLength(0);
  });

  it("onEnter throwing after state change leaves machine in the new state", () => {
    const m = createMachine<"idle" | "active", "START">({
      initial: "idle",
      states: {
        idle: { on: { START: "active" } },
        active: { onEnter: () => { throw new Error("enter failed"); } },
      },
    });
    expect(() => m.send("START")).toThrow("enter failed");
    // State was already committed before onEnter ran
    expect(m.state()).toBe("active");
    expect(m.history()).toHaveLength(1);
  });

  it("reset() calls onEnter of the initial state", () => {
    const onEnter = vi.fn();
    const m = createMachine<"idle" | "active", "START">({
      initial: "idle",
      states: {
        idle: { on: { START: "active" }, onEnter },
        active: {},
      },
    });
    m.send("START");
    m.reset();
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("calls onTransition callback", () => {
    const onTransition = vi.fn();
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: "b" } },
        b: {},
      },
      onTransition,
    });
    m.send("NEXT");
    expect(onTransition).toHaveBeenCalledWith("a", "NEXT", "b");
  });

  it("state with on:{} — can() returns false for all events", () => {
    const m = createMachine<"idle", "START" | "STOP">({
      initial: "idle",
      states: {
        idle: { on: {} },
      },
    });
    expect(m.can("START")).toBe(false);
    expect(m.can("STOP")).toBe(false);
  });

  it("circular transition A→B→A — history contains correct entries", () => {
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: "b" } },
        b: { on: { NEXT: "a" } },
      },
    });
    m.send("NEXT"); // a→b
    m.send("NEXT"); // b→a
    const h = m.history();
    expect(h).toHaveLength(2);
    expect(h[0]).toEqual({ from: "a", event: "NEXT", to: "b" });
    expect(h[1]).toEqual({ from: "b", event: "NEXT", to: "a" });
  });

  it("send() with undefined event — does not crash, returns false", () => {
    const m = trafficLight();
    // Cast to bypass TypeScript — runtime guard should handle it gracefully
    expect(m.send(undefined as unknown as TrafficEvent)).toBe(false);
  });

  it("onEnter callback is called AFTER the state has changed", () => {
    let stateAtOnEnter: string | undefined;
    const m = createMachine<"idle" | "active", "START">({
      initial: "idle",
      states: {
        idle: { on: { START: "active" } },
        active: {
          onEnter() {
            stateAtOnEnter = m.state();
          },
        },
      },
    });
    m.send("START");
    expect(stateAtOnEnter).toBe("active");
  });

  it("history not polluted by failed transitions (onExit throws)", () => {
    const m = createMachine<"idle" | "active", "START">({
      initial: "idle",
      states: {
        idle: {
          on: { START: "active" },
          onExit: () => { throw new Error("blocked"); },
        },
        active: {},
      },
    });
    expect(() => m.send("START")).toThrow("blocked");
    expect(m.history()).toHaveLength(0);
    expect(m.state()).toBe("idle");
  });

  // ── Guards ──────────────────────────────────────────────────────────────────

  it("guard returning true allows the transition", () => {
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", guard: () => true } } },
        b: {},
      },
    });
    expect(m.send("NEXT")).toBe(true);
    expect(m.state()).toBe("b");
  });

  it("guard returning false blocks the transition — send returns false", () => {
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", guard: () => false } } },
        b: {},
      },
    });
    expect(m.send("NEXT")).toBe(false);
    expect(m.state()).toBe("a");
  });

  it("guard returning false — history not updated", () => {
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", guard: () => false } } },
        b: {},
      },
    });
    m.send("NEXT");
    expect(m.history()).toHaveLength(0);
  });

  it("guard returning false — onExit is NOT called", () => {
    const onExit = vi.fn();
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", guard: () => false } }, onExit },
        b: {},
      },
    });
    m.send("NEXT");
    expect(onExit).not.toHaveBeenCalled();
  });

  it("can() returns false when guard returns false", () => {
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", guard: () => false } } },
        b: {},
      },
    });
    expect(m.can("NEXT")).toBe(false);
  });

  it("can() returns true when guard returns true", () => {
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", guard: () => true } } },
        b: {},
      },
    });
    expect(m.can("NEXT")).toBe(true);
  });

  it("guard is evaluated at transition time, not at definition time", () => {
    let allow = false;
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", guard: () => allow } } },
        b: {},
      },
    });
    expect(m.send("NEXT")).toBe(false);
    allow = true;
    expect(m.send("NEXT")).toBe(true);
    expect(m.state()).toBe("b");
  });

  it("transition without guard behaves as before (plain string target)", () => {
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: "b" } },
        b: {},
      },
    });
    expect(m.can("NEXT")).toBe(true);
    expect(m.send("NEXT")).toBe(true);
    expect(m.state()).toBe("b");
  });

  // ── Per-transition action ───────────────────────────────────────────────────

  it("action is called on successful transition", () => {
    const action = vi.fn();
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", action } } },
        b: {},
      },
    });
    m.send("NEXT");
    expect(action).toHaveBeenCalledOnce();
  });

  it("action is NOT called when guard blocks the transition", () => {
    const action = vi.fn();
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", guard: () => false, action } } },
        b: {},
      },
    });
    m.send("NEXT");
    expect(action).not.toHaveBeenCalled();
  });

  it("action runs after onTransition and before onEnter", () => {
    const order: string[] = [];
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: { target: "b", action: () => { order.push("action"); } } } },
        b: { onEnter: () => { order.push("onEnter"); } },
      },
      onTransition: () => { order.push("onTransition"); },
    });
    m.send("NEXT");
    expect(order).toEqual(["onTransition", "action", "onEnter"]);
  });

  // ── onEnter / onExit context ────────────────────────────────────────────────

  it("onEnter receives event and from-state in context", () => {
    let ctx: { event: string; from: string } | undefined;
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: "b" } },
        b: { onEnter: (c) => { ctx = c; } },
      },
    });
    m.send("NEXT");
    expect(ctx).toEqual({ event: "NEXT", from: "a" });
  });

  it("onExit receives event and to-state in context", () => {
    let ctx: { event: string; to: string } | undefined;
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: "b" }, onExit: (c) => { ctx = c; } },
        b: {},
      },
    });
    m.send("NEXT");
    expect(ctx).toEqual({ event: "NEXT", to: "b" });
  });

  it("onEnter and onExit called without context on reset()", () => {
    const onEnter = vi.fn();
    const onExit = vi.fn();
    const m = createMachine<"idle" | "active", "START">({
      initial: "idle",
      states: {
        idle: { on: { START: "active" }, onEnter },
        active: { onExit },
      },
    });
    m.send("START");
    m.reset();
    expect(onExit).toHaveBeenCalledWith(undefined);
    expect(onEnter).toHaveBeenCalledWith(undefined);
  });

  it("zero-argument onEnter/onExit still work with context (backward compat)", () => {
    const onEnter = vi.fn();
    const onExit = vi.fn();
    const m = createMachine<"a" | "b", "NEXT">({
      initial: "a",
      states: {
        a: { on: { NEXT: "b" }, onExit },
        b: { onEnter },
      },
    });
    m.send("NEXT");
    expect(onExit).toHaveBeenCalledOnce();
    expect(onEnter).toHaveBeenCalledOnce();
  });
});
