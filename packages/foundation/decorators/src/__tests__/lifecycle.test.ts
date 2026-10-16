import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { signal } from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";
import {
  createLifecycleMethodDecorator,
  lifecycleMethodDecorator,
} from "../create-lifecycle-method-decorator";
import { Debounce } from "../functions/debounce";
import { Watch } from "../functions/watch";
import { addLifecycleHooks } from "../lifecycle";
import { History } from "../properties/history";
import { State } from "../properties/state";

function hookField(log: string[], label: string) {
  return createFieldDecorator({
    bind: () => ({
      onMount: () => { log.push(`${label}:mount`); },
      onUnmount: () => { log.push(`${label}:unmount`); },
    }),
  });
}

function hookMethod(log: string[]) {
  return createLifecycleMethodDecorator({
    register(callback) {
      callback("mounted");
      return () => { log.push("method:cleanup"); };
    },
  });
}

describe("addLifecycleHooks", () => {
  it("runs the object's own hooks first, then the added ones in order, with the instance", () => {
    const log: string[] = [];
    const target = {
      onMount() { log.push("own:mount"); },
      onUnmount() { log.push("own:unmount"); },
    };
    addLifecycleHooks(target, (i) => { log.push(`a:mount:${String(i === target)}`); }, (i) => { log.push(`a:unmount:${String(i === target)}`); });
    addLifecycleHooks(target, undefined, () => { log.push("b:unmount"); });
    addLifecycleHooks(target, () => { log.push("c:mount"); }, undefined);

    target.onMount();
    target.onUnmount();
    expect(log).toEqual([
      "own:mount", "a:mount:true", "c:mount",
      "own:unmount", "a:unmount:true", "b:unmount",
    ]);
  });

  it("chains onto whatever onMount/onUnmount the object has at the time", () => {
    const log: string[] = [];
    const target = {} as { onMount: () => void; onUnmount: () => void };
    addLifecycleHooks(target, () => { log.push("first:mount"); }, () => { log.push("first:unmount"); });
    const chained = target.onMount;
    target.onMount = function () { chained.call(this); log.push("patched:mount"); };
    addLifecycleHooks(target, () => { log.push("second:mount"); }, undefined);

    target.onMount();
    target.onUnmount();
    expect(log).toEqual(["first:mount", "patched:mount", "second:mount", "first:unmount"]);
  });

  it("works on objects with no hooks of their own", () => {
    const mount = vi.fn();
    const target = {} as { onMount: () => void; onUnmount: () => void };
    addLifecycleHooks(target, mount, undefined);
    target.onMount();
    target.onUnmount();
    expect(mount).toHaveBeenCalledOnce();
  });
});

describe("lifecycle chaining on real components", () => {
  it("runs the component's own hooks first, then decorator hooks in declaration order", () => {
    const log: string[] = [];
    const first = hookField(log, "first");
    const second = hookField(log, "second");
    const method = hookMethod(log);

    class Widget extends StatefulComponent {
      @first a = 1;
      @method onReady() { log.push("method:mount"); }
      @second b = 2;
      onMount() { log.push("own:mount"); }
      onUnmount() { log.push("own:unmount"); }
      render() { return null; }
    }

    const widget = new Widget();
    widget.onMount();
    widget.onUnmount();
    expect(log).toEqual([
      "own:mount", "method:mount", "first:mount", "second:mount",
      "own:unmount", "method:cleanup", "first:unmount", "second:unmount",
    ]);
  });

  it("does not leak a registration when onMount runs twice without an unmount", () => {
    const handler = vi.fn();
    class Widget extends StatefulComponent {
      @State() count = 0;
      @Watch("count") onCount(value: number) { handler(value); }
      render() { return null; }
    }

    const widget = new Widget();
    widget.onMount?.();
    widget.onMount?.();
    widget.count = 1;
    expect(handler).toHaveBeenCalledOnce();

    widget.onUnmount?.();
    widget.count = 2;
    expect(handler).toHaveBeenCalledOnce();
  });

  it("re-registers after an unmount/mount cycle", () => {
    const handler = vi.fn();
    class Widget extends StatefulComponent {
      @State() count = 0;
      @Watch("count") onCount(value: number) { handler(value); }
      render() { return null; }
    }

    const widget = new Widget();
    widget.onMount?.();
    widget.onUnmount?.();
    widget.onMount?.();
    widget.count = 3;
    expect(handler).toHaveBeenCalledExactlyOnceWith(3);
  });

  it("lets createLifecycleMethodDecorator registrations return nothing", () => {
    const register = vi.fn(() => undefined);
    const decorator = createLifecycleMethodDecorator({ register });
    class Widget extends StatefulComponent {
      @decorator onReady() { /* noop */ }
      render() { return null; }
    }

    const widget = new Widget();
    widget.onMount?.();
    widget.onUnmount?.();
    widget.onMount?.();
    expect(register).toHaveBeenCalledTimes(2);
  });

  it("binds the callback handed to register to the instance", () => {
    let seen: unknown;
    const decorator = createLifecycleMethodDecorator({
      register(callback) {
        callback();
        return undefined;
      },
    });
    class Widget extends StatefulComponent {
      @decorator onReady() { seen = this; }
      render() { return null; }
    }

    const widget = new Widget();
    widget.onMount?.();
    expect(seen).toBe(widget);
  });

  it("stops function cleanups and effect cleanups alike", () => {
    const source = signal(0);
    const effectRuns = vi.fn();
    const stop = vi.fn();
    const viaFunction = lifecycleMethodDecorator(() => stop);

    class Widget extends StatefulComponent {
      @viaFunction a() { /* noop */ }
      @Watch("value" as never) b() { effectRuns(); }
      get value() { return source(); }
      render() { return null; }
    }

    const widget = new Widget();
    widget.onMount?.();
    widget.onUnmount?.();
    source.set(1);
    expect(stop).toHaveBeenCalledOnce();
    expect(effectRuns).not.toHaveBeenCalled();
  });

  it("only hooks @Debounce into unmount once the method has been called", () => {
    vi.useFakeTimers();
    try {
      const run = vi.fn();
      class Search extends StatefulComponent {
        @Debounce(50) query() { run(); }
        render() { return null; }
      }

      const idle = new Search();
      expect(Object.hasOwn(idle, "onUnmount")).toBe(false);

      const active = new Search();
      active.query();
      active.query();
      active.onUnmount?.();
      vi.advanceTimersByTime(100);
      expect(run).not.toHaveBeenCalled();

      active.query();
      vi.advanceTimersByTime(100);
      expect(run).toHaveBeenCalledOnce();
      active.onUnmount?.();
    } finally {
      vi.useRealTimers();
    }
  });

  it("destroys @History on unmount even when it is declared on a subclass", () => {
    class Base extends StatefulComponent {
      @State() score = 0;
      render() { return null; }
    }
    class Child extends Base {
      @History("score") scoreHistory!: { values: () => unknown[] };
    }

    const child = new Child();
    expect(child.scoreHistory.values()).toEqual([0]);
    child.onUnmount?.();
    child.score = 1;
    expect(child.scoreHistory.values()).toEqual([0]);
  });
});
