import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";

import * as decorators from "../index";
import { Command } from "../events/command";
import { Compose } from "../properties/compose";
import { DeepState } from "../properties/deep-state";
import { FunctionProp } from "../properties/function-prop";
import { History } from "../properties/history";
import { Ref } from "../properties/ref";
import { State } from "../properties/state";

function accessorsOf(object: object, name: string) {
  const descriptor = Object.getOwnPropertyDescriptor(object, name);
  return [descriptor?.get, descriptor?.set];
}

describe("field decorators on real classes", () => {
  class Panel extends StatefulComponent {
    @State() count = 0;
    @Ref() el!: decorators.Ref<HTMLElement>;
    @Command() reset!: decorators.Command;
    @DeepState() config = { nested: { on: false } };
    @FunctionProp() format = (n: number) => String(n);
    @History("count") countHistory!: unknown;
    render() { return null; }
  }

  it("share one accessor pair per field across instances", () => {
    const a = new Panel();
    const b = new Panel();
    for (const name of ["el", "reset", "config", "format", "countHistory"]) {
      expect(accessorsOf(a, name)).toEqual(accessorsOf(b, name));
    }
  });

  it("give every instance its own ref and command, stable across reads", () => {
    const a = new Panel();
    const b = new Panel();
    expect(a.el).toBe(a.el);
    expect(a.reset).toBe(a.reset);
    expect(a.el).not.toBe(b.el);
    expect(a.reset).not.toBe(b.reset);
  });

  it("keep refs and commands read-only, as before", () => {
    const panel = new Panel();
    expect(() => { (panel as { el: unknown }).el = null; }).toThrow(TypeError);
    expect(() => { (panel as { reset: unknown }).reset = null; }).toThrow(TypeError);
  });

  it("keep deep state per instance", () => {
    const a = new Panel();
    const b = new Panel();
    a.config.nested.on = true;
    expect(a.config.nested.on).toBe(true);
    expect(b.config.nested.on).toBe(false);
    expect(a.config.nested).toBe(a.config.nested);
  });
});

describe("@Compose lifecycle", () => {
  it("hooks only the lifecycle methods the composable has", () => {
    const mounted = vi.fn();
    const unmounted = vi.fn();
    class OnlyMount { setup() { return {}; } onMount() { mounted(); } }
    class OnlyUnmount { setup() { return {}; } onUnmount() { unmounted(); } }
    class Neither { setup() { return {}; } }

    class Host extends StatefulComponent {
      @Compose(OnlyMount) a!: object;
      @Compose(OnlyUnmount) b!: object;
      @Compose(Neither) c!: object;
      render() { return null; }
    }

    const host = new Host();
    host.onMount?.();
    host.onUnmount?.();
    expect(mounted).toHaveBeenCalledOnce();
    expect(unmounted).toHaveBeenCalledOnce();
    expect(Object.hasOwn(new (class extends StatefulComponent {
      @Compose(Neither) c!: object;
      render() { return null; }
    })(), "onMount")).toBe(false);
  });
});

describe("package entry", () => {
  it("exports the decorators and builders", () => {
    expect(typeof decorators.State).toBe("function");
    expect(typeof decorators.createFieldDecorator).toBe("function");
    expect(typeof decorators.reactiveHostType).toBe("symbol");
  });
});
