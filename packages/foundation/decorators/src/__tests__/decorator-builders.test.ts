// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import type { RootComponent } from "@praxisjs/core/internal";

import { ClassBehavior, createClassDecorator, type ClassEnhancement } from "../create-class-decorator";
import { createGetterObserverDecorator, createWritableGetterDecorator } from "../create-getter-decorator";

function getterContext(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    context: {
      name,
      kind: "getter" as const,
      addInitializer(fn: (this: unknown) => void) {
        initializers.push(fn);
      },
    } as unknown as ClassGetterDecoratorContext,
    init(instance: object) {
      for (const fn of initializers) fn.call(instance);
    },
  };
}

describe("createWritableGetterDecorator", () => {
  it("binds once per instance while it is built and reads and writes through the binding", () => {
    const bind = vi.fn((instance: object) => {
      let value = 0;
      return { get: () => value, set: (next: unknown) => { value = next as number; }, instance };
    });
    const decorator = createWritableGetterDecorator({ bind });
    class Counter {
      @decorator get value(): number { return 1; }
    }
    const a = new Counter();
    const b = new Counter();
    expect(bind).toHaveBeenCalledTimes(2);
    expect(bind.mock.calls[0]).toEqual([a, "value", expect.any(Function)]);
    (a as { value: number }).value = 5;
    expect(a.value).toBe(5);
    expect(b.value).toBe(0);
  });

  it("shares one accessor pair on the class instead of defining one per instance", () => {
    const decorator = createWritableGetterDecorator({ bind: () => ({ get: () => 1, set: () => undefined }) });
    class Counter {
      @decorator get value(): number { return 1; }
    }
    const instance = new Counter();
    expect(Object.getOwnPropertyDescriptor(instance, "value")).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(Counter.prototype, "value")?.set).toBeTypeOf("function");
  });

  it("throws on assignment when the binding has no setter, like a getter without one", () => {
    const decorator = createWritableGetterDecorator({ bind: () => ({ get: () => 42 }) });
    class Answer {
      @decorator get answer(): number { return 0; }
    }
    const instance = new Answer();
    expect(instance.answer).toBe(42);
    expect(() => { (instance as { answer: number }).answer = 1; }).toThrow(
      "Cannot set property answer, which has only a getter.",
    );
  });

  it("defines the pair on each object when applied by hand, outside a class", () => {
    const decorator = createWritableGetterDecorator({
      bind(instance) {
        const store = instance as { stored?: number };
        return { get: () => store.stored ?? 0, set: (value) => { store.stored = value as number; } };
      },
    });
    const { context, init } = getterContext("value");
    const original = function () { return 1; };
    const replacement = decorator(original, context);
    const instance = {} as Record<string, number>;
    init(instance);
    instance.value = 5;
    expect(instance.value).toBe(5);
    expect(Object.getOwnPropertyDescriptor(instance, "value")?.get).toBe(replacement);
  });

  it("binds an object the constructor did not build on its first read", () => {
    const decorator = createWritableGetterDecorator({ bind: () => ({ get: () => "late" }) });
    class Late {
      @decorator get value(): string { return ""; }
    }
    new Late();
    expect((Object.create(Late.prototype) as Late).value).toBe("late");
  });
});

describe("createGetterObserverDecorator", () => {
  it("calls observe once per instance with the getter and its name", () => {
    const observe = vi.fn();
    const decorator = createGetterObserverDecorator({ observe });
    const { context, init } = getterContext("total");
    const getter = function () { return 1; };
    decorator(getter, context);
    const instance = {};
    init(instance);
    expect(observe).toHaveBeenCalledWith(getter, instance, "total");
  });
});

describe("createClassDecorator", () => {
  class Wrap extends ClassBehavior {
    create(): ClassEnhancement {
      return {
        render(originalRender) {
          const inner = originalRender();
          return inner === null ? null : [inner as Node, document.createComment("wrapped")];
        },
      };
    }
  }

  it("lets an enhancement wrap render, calling the original exactly once", () => {
    class Base extends StatefulComponent {
      render() {
        return document.createElement("p");
      }
    }
    const Enhanced = createClassDecorator(new Wrap())(Base, {} as ClassDecoratorContext);
    const out = new Enhanced().render() as unknown as Node[];
    expect(out).toHaveLength(2);
    expect((out[0] as Element).tagName).toBe("P");
  });

  it("skips inner enhancements while an outer one renders the original, so nothing re-enters", () => {
    class Base extends StatefulComponent {
      render() {
        return document.createElement("p");
      }
    }
    const inner = createClassDecorator(new Wrap())(Base, {} as ClassDecoratorContext);
    const outer = createClassDecorator(new Wrap())(inner, {} as ClassDecoratorContext);
    const out = new outer().render() as unknown as Node[];
    expect(out.filter((n) => n.nodeType === Node.COMMENT_NODE)).toHaveLength(1);
  });

  it("leaves render undefined when the original class has none", () => {
    class NoRender extends StatefulComponent {
      render() {
        return null;
      }
    }
    delete (NoRender.prototype as { render?: unknown }).render;
    const Enhanced = createClassDecorator(new Wrap())(
      NoRender as unknown as new () => RootComponent<Record<string, never>>,
      {} as ClassDecoratorContext,
    );
    expect((new Enhanced() as { render?: unknown }).render).toBeUndefined();
  });
});
