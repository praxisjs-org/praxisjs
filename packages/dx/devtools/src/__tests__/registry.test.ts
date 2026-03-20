import { beforeEach, describe, it, expect, vi } from "vitest";

import { Registry } from "../core/registry";

// Reset singleton before each test to keep tests isolated
beforeEach(() => {
  (Registry as unknown as { _instance: Registry | null })._instance = null;
});

describe("Registry singleton", () => {
  it("returns the same instance on subsequent accesses", () => {
    const a = Registry.instance;
    const b = Registry.instance;
    expect(a).toBe(b);
  });

  it("creates a fresh instance after reset", () => {
    const first = Registry.instance;
    (Registry as unknown as { _instance: Registry | null })._instance = null;
    const second = Registry.instance;
    expect(first).not.toBe(second);
  });
});

describe("Registry.registerSignal", () => {
  it("stores the signal and emits 'signal:registered'", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("signal:registered", handler);

    const instance = {};
    registry.registerSignal(instance, "count", 0, "Counter");

    const signals = registry.getSignals();
    expect(signals).toHaveLength(1);
    expect(signals[0].label).toBe("count");
    expect(signals[0].value).toBe(0);
    expect(signals[0].componentName).toBe("Counter");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("builds the signal id as componentId:key", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerSignal(instance, "name", "Alice", "MyComp");
    const signal = registry.getSignals()[0];
    expect(signal.id).toMatch(/:.+/);
    expect(signal.id.endsWith(":name")).toBe(true);
  });

  it("initialises history with the initial value", () => {
    const registry = Registry.instance;
    registry.registerSignal({}, "x", 42, "Comp");
    const signal = registry.getSignals()[0];
    expect(signal.history).toHaveLength(1);
    expect(signal.history[0].value).toBe(42);
  });
});

describe("Registry.updateSignal", () => {
  it("updates the value and appends to history", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerSignal(instance, "count", 0, "Counter");
    registry.updateSignal(instance, "count", 1, 0);

    const signal = registry.getSignals()[0];
    expect(signal.value).toBe(1);
    expect(signal.history).toHaveLength(2);
    expect(signal.history[1].value).toBe(1);
  });

  it("emits 'signal:changed' with old and new value", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("signal:changed", handler);

    const instance = {};
    registry.registerSignal(instance, "val", "old", "Comp");
    registry.updateSignal(instance, "val", "new", "old");

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0] as { entry: { value: unknown }; oldValue: unknown };
    expect(payload.entry.value).toBe("new");
    expect(payload.oldValue).toBe("old");
  });

  it("caps history at 20 entries", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerSignal(instance, "n", 0, "Comp");
    for (let i = 1; i <= 25; i++) {
      registry.updateSignal(instance, "n", i, i - 1);
    }
    const signal = registry.getSignals()[0];
    expect(signal.history.length).toBe(20);
  });

  it("does nothing when the signal does not exist", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("signal:changed", handler);
    registry.updateSignal({}, "missing", 1, 0);
    expect(handler).not.toHaveBeenCalled();
  });

  it("pushes a 'signal:change' timeline entry", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerSignal(instance, "x", 0, "Comp");
    registry.updateSignal(instance, "x", 5, 0);
    const timeline = registry.getTimeline();
    const entry = timeline.find((t) => t.type === "signal:change");
    expect(entry).toBeDefined();
    expect(entry?.data.new).toBe(5);
    expect(entry?.data.old).toBe(0);
  });
});

describe("Registry.registerComponent", () => {
  it("stores the component and emits 'component:registered'", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("component:registered", handler);

    const instance = {};
    registry.registerComponent(instance, "MyComp");

    const components = registry.getComponents();
    expect(components).toHaveLength(1);
    expect(components[0].name).toBe("MyComp");
    expect(components[0].renderCount).toBe(0);
    expect(components[0].status).toBe("mounted");
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe("Registry.recordRender", () => {
  it("increments renderCount and emits 'component:render'", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("component:render", handler);

    const instance = {};
    registry.registerComponent(instance, "App");
    registry.recordRender(instance, 5.2);

    const comp = registry.getComponents()[0];
    expect(comp.renderCount).toBe(1);
    expect(comp.lastRenderDuration).toBe(5.2);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("accumulates renderCount across multiple renders", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerComponent(instance, "App");
    registry.recordRender(instance, 1);
    registry.recordRender(instance, 2);
    registry.recordRender(instance, 3);
    expect(registry.getComponents()[0].renderCount).toBe(3);
  });

  it("does nothing when the component does not exist", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("component:render", handler);
    registry.recordRender({}, 1);
    expect(handler).not.toHaveBeenCalled();
  });

  it("pushes a 'component:render' timeline entry", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerComponent(instance, "App");
    registry.recordRender(instance, 3.5);
    const entry = registry.getTimeline().find((t) => t.type === "component:render");
    expect(entry).toBeDefined();
    expect(entry?.data.duration).toBe(3.5);
  });
});

describe("Registry.recordLifecycle", () => {
  it("records a lifecycle event and emits 'lifecycle'", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("lifecycle", handler);

    const instance = {};
    registry.registerComponent(instance, "Comp");
    registry.recordLifecycle(instance, "onMount");

    expect(handler).toHaveBeenCalledOnce();
    const payload = handler.mock.calls[0][0] as { hook: string; name: string };
    expect(payload.hook).toBe("onMount");
    expect(payload.name).toBe("Comp");
  });

  it("removes component and its signals on 'onUnmount'", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerComponent(instance, "Comp");
    registry.registerSignal(instance, "val", 1, "Comp");

    expect(registry.getComponents()).toHaveLength(1);
    expect(registry.getSignals()).toHaveLength(1);

    registry.recordLifecycle(instance, "onUnmount");

    expect(registry.getComponents()).toHaveLength(0);
    expect(registry.getSignals()).toHaveLength(0);
  });

  it("emits 'component:unmount' on onUnmount", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("component:unmount", handler);

    const instance = {};
    registry.registerComponent(instance, "Comp");
    registry.recordLifecycle(instance, "onUnmount");

    expect(handler).toHaveBeenCalledOnce();
  });

  it("maps onBeforeMount hook to 'component:mount' timeline type", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerComponent(instance, "Comp");
    registry.recordLifecycle(instance, "onBeforeMount");
    const entry = registry.getTimeline().find((t) => t.type === "component:mount");
    expect(entry).toBeDefined();
  });

  it("maps onUnmount hook to 'component:unmount' timeline type", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerComponent(instance, "Comp");
    registry.recordLifecycle(instance, "onUnmount");
    const entry = registry.getTimeline().find((t) => t.type === "component:unmount");
    expect(entry).toBeDefined();
  });

  it("maps other hooks to 'lifecycle' timeline type", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerComponent(instance, "Comp");
    registry.recordLifecycle(instance, "onUpdate");
    const entry = registry.getTimeline().find((t) => t.type === "lifecycle");
    expect(entry).toBeDefined();
  });

  it("does nothing when the component does not exist", () => {
    const registry = Registry.instance;
    const handler = vi.fn();
    registry.bus.on("lifecycle", handler);
    registry.recordLifecycle({}, "onMount");
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("Registry.recordMethodCall", () => {
  it("pushes a 'method:call' timeline entry", () => {
    const registry = Registry.instance;
    const timelineHandler = vi.fn();
    registry.bus.on("timeline:push", timelineHandler);

    const instance = {};
    registry.recordMethodCall(instance, "doSomething", [1, 2], "result", 3.14, "MyComp");

    const entry = registry.getTimeline().find((t) => t.type === "method:call");
    expect(entry).toBeDefined();
    expect(entry?.label).toBe("MyComp.doSomething()");
    expect(entry?.data.args).toEqual([1, 2]);
    expect(entry?.data.result).toBe("result");
    expect(entry?.data.duration).toBe(3.14);
    expect(timelineHandler).toHaveBeenCalledOnce();
  });
});

describe("Registry.getSignalsByComponent", () => {
  it("returns only signals belonging to the given component", () => {
    const registry = Registry.instance;
    const inst1 = {};
    const inst2 = {};
    registry.registerComponent(inst1, "Comp1");
    registry.registerComponent(inst2, "Comp2");
    registry.registerSignal(inst1, "a", 1, "Comp1");
    registry.registerSignal(inst2, "b", 2, "Comp2");

    const comp1Id = registry.getComponents().find((c) => c.name === "Comp1")!.id;
    const signals = registry.getSignalsByComponent(comp1Id);
    expect(signals).toHaveLength(1);
    expect(signals[0].label).toBe("a");
  });
});

describe("Registry.recordLifecycle — onUnmount cross-component isolation", () => {
  it("only removes signals belonging to the unmounted component", () => {
    const registry = Registry.instance;
    const inst1 = {};
    const inst2 = {};
    registry.registerComponent(inst1, "Comp1");
    registry.registerComponent(inst2, "Comp2");
    registry.registerSignal(inst1, "a", 1, "Comp1");
    registry.registerSignal(inst2, "b", 2, "Comp2");

    registry.recordLifecycle(inst1, "onUnmount");

    // inst1's signal is gone, inst2's signal remains
    const remaining = registry.getSignals();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].label).toBe("b");
  });
});

describe("Registry timeline cap", () => {
  it("caps timeline at 200 entries", () => {
    const registry = Registry.instance;
    const instance = {};
    registry.registerComponent(instance, "Comp");

    // Each updateSignal pushes one timeline entry (plus the registerSignal = 0 entries)
    registry.registerSignal(instance, "val", 0, "Comp");
    for (let i = 1; i <= 210; i++) {
      registry.updateSignal(instance, "val", i, i - 1);
    }

    expect(registry.getTimeline().length).toBe(200);
  });
});
