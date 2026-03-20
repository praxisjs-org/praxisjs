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

describe("Trace — lifecycle hooks", () => {
  const hooks = ["onMount", "onUnmount", "onBeforeUpdate", "onUpdate", "onAfterUpdate"] as const;

  for (const hook of hooks) {
    it(`wraps ${hook} and records the lifecycle event`, () => {
      class Comp {
        onBeforeMount() {}
      }
      const Traced = applyTrace(Comp);
      const instance = new Traced() as Record<string, () => void>;

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
      (Comp.prototype as Record<string, unknown>)[hook] = spy;
      const Traced = applyTrace(Comp);
      const instance = new Traced() as Record<string, () => void>;

      instance.onBeforeMount();
      instance[hook]?.();
      expect(spy).toHaveBeenCalled();
    });
  }
});
