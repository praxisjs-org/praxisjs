import { beforeEach, describe, it, expect, vi } from "vitest";

import { Registry } from "../core/registry";
import { Trace } from "../decorators/trace";

// Reset the Registry singleton before each test
beforeEach(() => {
  (Registry as unknown as { _instance: Registry | null })._instance = null;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor = new (...args: any[]) => any;

function applyTrace<T extends AnyConstructor>(cls: T): T {
  return Trace()(cls, {} as ClassDecoratorContext);
}

// ── Trace decorator ───────────────────────────────────────────────────────────

describe("Trace — render()", () => {
  it("records a render event after calling render()", () => {
    class MyComp {
      render() { return "html"; }
    }
    const Traced = applyTrace(MyComp);
    const instance = new Traced() as { render: () => string };

    const registry = Registry.instance;
    registry.registerComponent(instance, "MyComp");

    instance.render();

    const renders = registry.getTimeline().filter((e) => e.type === "component:render");
    expect(renders).toHaveLength(1);
    expect(renders[0].label).toBe("<MyComp>");
  });

  it("returns the original render result", () => {
    class Box {
      render() { return "<div>box</div>"; }
    }
    const Traced = applyTrace(Box);
    const instance = new Traced() as { render: () => string };

    Registry.instance.registerComponent(instance, "Box");
    expect(instance.render()).toBe("<div>box</div>");
  });

  it("wraps render even when it takes arguments", () => {
    class Comp {
      render(ctx: string) { return ctx; }
    }
    const Traced = applyTrace(Comp);
    const instance = new Traced() as { render: (ctx: string) => string };

    Registry.instance.registerComponent(instance, "Comp");
    const result = instance.render("ctx-arg");
    expect(result).toBe("ctx-arg");
  });

  it("does not wrap render when the class has no render method", () => {
    class NoRender {}
    const Traced = applyTrace(NoRender);
    const instance = new Traced() as Record<string, unknown>;
    expect(instance.render).toBeUndefined();
  });
});

describe("Trace — onBeforeMount()", () => {
  it("registers the component in the registry on onBeforeMount", () => {
    class Widget {
      onBeforeMount() {}
    }
    const Traced = applyTrace(Widget);
    const instance = new Traced() as { onBeforeMount: () => void };

    const registry = Registry.instance;
    instance.onBeforeMount();

    const components = registry.getComponents();
    expect(components).toHaveLength(1);
    expect(components[0].name).toBe("Widget");
  });

  it("calls the original onBeforeMount when it exists", () => {
    const originalSpy = vi.fn();
    class Panel {
      onBeforeMount() { originalSpy(); }
    }
    const Traced = applyTrace(Panel);
    const instance = new Traced() as { onBeforeMount: () => void };

    instance.onBeforeMount();
    expect(originalSpy).toHaveBeenCalled();
  });

  it("records a component:mount timeline event on onBeforeMount", () => {
    class App {
      onBeforeMount() {}
    }
    const Traced = applyTrace(App);
    const instance = new Traced() as { onBeforeMount: () => void };

    instance.onBeforeMount();

    const mounts = Registry.instance.getTimeline().filter((e) => e.type === "component:mount");
    expect(mounts).toHaveLength(1);
  });
});

describe("Trace — class with no render() method", () => {
  it("does not crash and no duration is recorded when render is absent", () => {
    class NoRender {
      onBeforeMount() {}
    }
    const Traced = applyTrace(NoRender);
    const instance = new Traced() as unknown as Record<string, () => void>;

    const registry = Registry.instance;
    instance.onBeforeMount();

    // render does not exist — calling it should not be attempted
    expect(instance.render).toBeUndefined();

    // No component:render timeline entries should exist
    const renderEntries = registry.getTimeline().filter((e) => e.type === "component:render");
    expect(renderEntries).toHaveLength(0);
  });
});

describe("Trace — lifecycle hook call order", () => {
  it("calls onBeforeMount → render → (async) onMount in correct order", async () => {
    const order: string[] = [];

    class App {
      onBeforeMount() { order.push("onBeforeMount"); }
      render() { order.push("render"); return "html"; }
      onMount() { order.push("onMount"); }
    }
    const Traced = applyTrace(App);
    const instance = new Traced() as {
      onBeforeMount: () => void;
      render: () => string;
      onMount: () => void;
    };

    const registry = Registry.instance;

    // Simulate the component lifecycle
    instance.onBeforeMount();
    instance.render();

    // onMount is called async (via the framework's create() hook), simulate it
    registry.registerComponent(instance, "App");
    instance.onMount();

    // The original methods (including Trace wrappers) run in call order
    expect(order).toEqual(["onBeforeMount", "render", "onMount"]);
  });
});

describe("Trace — lifecycle hooks", () => {
  const hooks = ["onMount", "onUnmount", "onBeforeUpdate", "onUpdate", "onAfterUpdate"] as const;

  for (const hook of hooks) {
    it(`wraps ${hook} and records the lifecycle event`, () => {
      class Comp {
        onBeforeMount() {}
      }
      const Traced = applyTrace(Comp);
      const instance = new Traced() as unknown as Record<string, () => void>;

      // Register the component first via onBeforeMount
      instance.onBeforeMount();

      instance[hook]?.();

      const events = Registry.instance.getTimeline().filter(
        (e) => e.data.hook === hook,
      );
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it(`${hook}: calls original implementation if it exists`, () => {
      const spy = vi.fn();
      class Comp {
        onBeforeMount() {}
      }
      (Comp.prototype as unknown as Record<string, unknown>)[hook] = spy;
      const Traced = applyTrace(Comp);
      const instance = new Traced() as unknown as Record<string, () => void>;

      instance.onBeforeMount();
      instance[hook]?.();
      expect(spy).toHaveBeenCalled();
    });
  }
});

describe("Trace — slow renders", () => {
  it("warns when a render takes longer than the threshold, and only then", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let busy = 0;
    class Slow {
      render() {
        const end = performance.now() + busy;
        while (performance.now() < end) { /* busy wait */ }
        return null;
      }
    }
    const Traced = Trace({ slow: 2 })(Slow as unknown as AnyConstructor, {} as ClassDecoratorContext);
    const instance = new Traced() as { render: () => unknown };
    instance.render();
    expect(warn).not.toHaveBeenCalled();
    busy = 5;
    instance.render();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/<Slow> rendered in .* ms \(over 2 ms\)/);
    warn.mockRestore();
  });
});

describe("production builds", () => {
  it("leave classes and members untouched", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const { Debug } = await import("../decorators/debug");
      class Plain { render() { return null; } }
      expect(Trace({ slow: 1 })(Plain as unknown as AnyConstructor, {} as ClassDecoratorContext)).toBe(Plain);
      const method = () => 1;
      expect(Debug()(method, { kind: "method", name: "m" } as unknown as ClassMethodDecoratorContext)).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
