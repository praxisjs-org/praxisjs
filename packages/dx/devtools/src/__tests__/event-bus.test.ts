import { describe, it, expect, vi } from "vitest";

import { EventBus } from "../core/event-bus";

describe("EventBus", () => {
  it("calls registered handler when event is emitted", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("test", handler);
    bus.emit("test", "payload");
    expect(handler).toHaveBeenCalledWith("payload");
  });

  it("calls multiple handlers for the same event", () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("event", h1);
    bus.on("event", h2);
    bus.emit("event", 42);
    expect(h1).toHaveBeenCalledWith(42);
    expect(h2).toHaveBeenCalledWith(42);
  });

  it("does not call handlers for different events", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on("a", handler);
    bus.emit("b", "data");
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not throw when emitting to an event with no handlers", () => {
    const bus = new EventBus();
    expect(() => bus.emit("no-listeners", null)).not.toThrow();
  });

  it("unsubscribe function removes the handler", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on("event", handler);
    unsub();
    bus.emit("event", "data");
    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribing one handler does not affect others", () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    const unsub = bus.on("event", h1);
    bus.on("event", h2);
    unsub();
    bus.emit("event", "data");
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledWith("data");
  });

  it("passes payload correctly to handler", () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const payload = { key: "value", nested: { n: 1 } };
    bus.on("event", handler);
    bus.emit("event", payload);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("each EventBus instance is independent", () => {
    const bus1 = new EventBus();
    const bus2 = new EventBus();
    const handler = vi.fn();
    bus1.on("event", handler);
    bus2.emit("event", "data");
    expect(handler).not.toHaveBeenCalled();
  });
});
