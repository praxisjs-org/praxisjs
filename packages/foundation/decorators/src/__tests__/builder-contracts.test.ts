import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";

import { ClassBehavior, createClassDecorator, type ClassEnhancement } from "../create-class-decorator";
import { createFieldDecorator } from "../create-field-decorator";
import { createGetterObserverDecorator } from "../create-getter-decorator";
import { createMethodDecorator } from "../create-method-decorator";
import { State } from "../properties/state";

// Behaviors other packages (devtools, features) build on.
describe("decorator builder contracts", () => {
  it("createFieldDecorator runs an onUnmount-only binding and keeps the field untouched", () => {
    const stop = vi.fn();
    const observe = createFieldDecorator({ bind: () => ({ onUnmount: stop }) });
    class Widget extends StatefulComponent {
      @observe @State() count = 1;
      render() { return null; }
    }
    const widget = new Widget();
    widget.count = 2;
    expect(widget.count).toBe(2);
    widget.onMount?.();
    widget.onUnmount?.();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("createMethodDecorator calls wrap(original, instance, name) once per instance", () => {
    const wrap = vi.fn((original: (...a: unknown[]) => unknown, _instance: object, _name: string) => original);
    const decorator = createMethodDecorator({ wrap });
    class Widget extends StatefulComponent {
      @decorator save() { return "saved"; }
      render() { return null; }
    }
    const widget = new Widget();
    expect(widget.save()).toBe("saved");
    expect(wrap).toHaveBeenCalledOnce();
    expect(wrap.mock.calls[0][1]).toBe(widget);
    expect(wrap.mock.calls[0][2]).toBe("save");
  });

  it("createGetterObserverDecorator observes once per instance", () => {
    const observe = vi.fn();
    const decorator = createGetterObserverDecorator({ observe });
    class Widget extends StatefulComponent {
      @decorator get total() { return 1; }
      render() { return null; }
    }
    const a = new Widget();
    const b = new Widget();
    expect(observe).toHaveBeenCalledTimes(2);
    expect(observe.mock.calls.map((c) => [c[1], c[2]])).toEqual([[a, "total"], [b, "total"]]);
  });

  it("createClassDecorator passes originalRender and calls initialize(Enhanced, original)", () => {
    const initialize = vi.fn();
    class Wrap extends ClassBehavior {
      create(): ClassEnhancement {
        return { render: (originalRender) => originalRender() };
      }
      initialize = initialize;
    }
    class Base extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = createClassDecorator(new Wrap())(Base, {} as ClassDecoratorContext);
    expect(new Enhanced().render()).toBeNull();
    expect(initialize).toHaveBeenCalledWith(Enhanced, Base);
  });
});
