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
});
