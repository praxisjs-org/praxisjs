import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";

import { createCommand } from "../events/command";
import { Emit } from "../events/emit";
import { readProp } from "../events/helper";
import { OnCommand } from "../events/on-command";

// ── Helpers ───────────────────────────────────────────────────────────────────

class TestComponent extends StatefulComponent {
  render() { return null; }
}

function methodCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "method" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassMethodDecoratorContext,
    run(instance: unknown) { initializers.forEach((fn) => { fn.call(instance); }); },
  };
}

// ── createCommand ─────────────────────────────────────────────────────────────

describe("createCommand", () => {
  it("trigger calls all subscribed handlers with the argument", () => {
    const cmd = createCommand<number>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    cmd.subscribe(h1);
    cmd.subscribe(h2);
    cmd.trigger(42);
    expect(h1).toHaveBeenCalledWith(42);
    expect(h2).toHaveBeenCalledWith(42);
  });

  it("trigger does nothing when no handlers are subscribed", () => {
    const cmd = createCommand<string>();
    expect(() => cmd.trigger("hello")).not.toThrow();
  });

  it("subscribe returns an unsubscribe function", () => {
    const cmd = createCommand<void>();
    const handler = vi.fn();
    const unsub = cmd.subscribe(handler);
    unsub();
    cmd.trigger();
    expect(handler).not.toHaveBeenCalled();
  });

  it("void command can be triggered without args", () => {
    const cmd = createCommand();
    const handler = vi.fn();
    cmd.subscribe(handler);
    cmd.trigger(undefined as unknown as void);
    expect(handler).toHaveBeenCalledOnce();
  });
});

// ── readProp ──────────────────────────────────────────────────────────────────

describe("readProp", () => {
  it("returns value from _rawProps when defined", () => {
    const instance = new TestComponent({ myProp: "fromParent" });
    expect(readProp(instance, "myProp")).toBe("fromParent");
  });

  it("falls back to _defaults when _rawProps does not define the prop", () => {
    const instance = new TestComponent();
    instance._defaults.myProp = "default";
    expect(readProp(instance, "myProp")).toBe("default");
  });

  it("returns undefined when prop is not in either", () => {
    const instance = new TestComponent();
    expect(readProp(instance, "missing")).toBeUndefined();
  });
});

// ── Emit ─────────────────────────────────────────────────────────────────────

describe("Emit decorator", () => {
  it("calls the prop callback with the return value of the method", () => {
    const { ctx, run } = methodCtx("handleInput");
    const original = function (this: object, value: string) { return value.toUpperCase(); };
    Emit("onChange")(original as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const callback = vi.fn();
    const instance = new TestComponent({ onChange: callback });
    run(instance);

    const method = (instance as unknown as Record<string, (v: string) => void>).handleInput;
    method.call(instance, "hello");
    expect(callback).toHaveBeenCalledWith("HELLO");
  });

  it("calls the prop callback with the method args when return value is undefined", () => {
    const { ctx, run } = methodCtx("doSomething");
    const original = function (this: object, a: number, b: number) { return undefined; };
    Emit("onDo")(original as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const callback = vi.fn();
    const instance = new TestComponent({ onDo: callback });
    run(instance);

    const method = (instance as unknown as Record<string, (a: number, b: number) => void>).doSomething;
    method.call(instance, 1, 2);
    expect(callback).toHaveBeenCalledWith(1, 2);
  });

  it("calls the prop callback with no args when return is undefined and no args", () => {
    const { ctx, run } = methodCtx("fire");
    const original = function (this: object) { return undefined; };
    Emit("onFire")(original as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const callback = vi.fn();
    const instance = new TestComponent({ onFire: callback });
    run(instance);

    const method = (instance as unknown as Record<string, () => void>).fire;
    method.call(instance);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith();
  });

  it("does not throw when the prop callback is not a function", () => {
    const { ctx, run } = methodCtx("submit");
    const original = function (this: object) { return "result"; };
    Emit("onSubmit")(original as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const instance = new TestComponent(); // no onSubmit prop
    run(instance);

    const method = (instance as unknown as Record<string, () => void>).submit;
    expect(() => method.call(instance)).not.toThrow();
  });

  it("still returns the original method's return value", () => {
    const { ctx, run } = methodCtx("compute");
    const original = function (this: object) { return 99; };
    Emit("onResult")(original as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const callback = vi.fn();
    const instance = new TestComponent({ onResult: callback });
    run(instance);

    const method = (instance as unknown as Record<string, () => number>).compute;
    const result = method.call(instance);
    expect(result).toBe(99);
  });
});

// ── OnCommand ─────────────────────────────────────────────────────────────────

describe("OnCommand decorator", () => {
  it("subscribes to the command on mount and calls the method when triggered", () => {
    const { ctx, run } = methodCtx("handleCmd");
    const handler = vi.fn();
    OnCommand("myCommand")(handler as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const cmd = createCommand<string>();
    const instance = new TestComponent({ myCommand: cmd });
    run(instance);

    instance.onMount?.();
    cmd.trigger("payload");
    expect(handler).toHaveBeenCalledWith("payload");
  });

  it("unsubscribes from the command on unmount", () => {
    const { ctx, run } = methodCtx("onMsg");
    const handler = vi.fn();
    OnCommand("msg")(handler as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const cmd = createCommand<string>();
    const instance = new TestComponent({ msg: cmd });
    run(instance);

    instance.onMount?.();
    instance.onUnmount?.();
    cmd.trigger("after-unmount");
    expect(handler).not.toHaveBeenCalled();
  });

  it("warns when the command prop is not provided", () => {
    const { ctx, run } = methodCtx("onMissing");
    OnCommand("missingProp")(vi.fn() as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const instance = new TestComponent(); // no missingProp
    run(instance);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    instance.onMount?.();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[OnCommand]"));
    warn.mockRestore();
  });

  it("warns when the command prop is not a valid Command", () => {
    const { ctx, run } = methodCtx("onBadCmd");
    OnCommand("badProp")(vi.fn() as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const instance = new TestComponent({ badProp: "not-a-command" });
    run(instance);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    instance.onMount?.();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[OnCommand]"));
    warn.mockRestore();
  });

  it("preserves the original onMount and onUnmount implementations", () => {
    const { ctx, run } = methodCtx("onEvt");
    OnCommand("evt")(vi.fn() as never, ctx as unknown as ClassMethodDecoratorContext<StatefulComponent>);

    const cmd = createCommand<void>();
    const instance = new TestComponent({ evt: cmd });
    run(instance);

    const mountSpy = vi.fn();
    const unmountSpy = vi.fn();
    const prevMount = instance.onMount?.bind(instance);
    const prevUnmount = instance.onUnmount?.bind(instance);
    instance.onMount = function () { mountSpy(); prevMount?.(); };
    instance.onUnmount = function () { unmountSpy(); prevUnmount?.(); };

    instance.onMount();
    instance.onUnmount();
    expect(mountSpy).toHaveBeenCalled();
    expect(unmountSpy).toHaveBeenCalled();
  });
});
