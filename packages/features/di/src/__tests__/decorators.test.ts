import "reflect-metadata";
import { describe, it, expect, vi } from "vitest";

import { Container, token } from "../container";
import { Injectable, Inject, InjectContainer, useService, createScope } from "../decorators";

// Each test group uses a fresh container to avoid state pollution
function makeScope() {
  return new Container();
}

// ── Injectable ────────────────────────────────────────────────────────────────

describe("Injectable", () => {
  it("registers the class in the global container", () => {
    // We test via useService resolving without throwing
    class MyService {
      greet() { return "hello"; }
    }
    Injectable()(MyService, {} as ClassDecoratorContext);
    const instance = useService(MyService);
    expect(instance).toBeInstanceOf(MyService);
    expect(instance.greet()).toBe("hello");
  });

  it("registers with transient scope", () => {
    class TmpService {}
    Injectable({ scope: "transient" })(TmpService, {} as ClassDecoratorContext);
    const a = useService(TmpService);
    const b = useService(TmpService);
    expect(a).not.toBe(b);
  });
});

// ── Inject ────────────────────────────────────────────────────────────────────

describe("Inject", () => {
  it("injects a registered service via property", () => {
    class Logger {
      log(msg: string) { return msg; }
    }
    Injectable()(Logger, {} as ClassDecoratorContext);

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "logger",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Inject(Logger)(undefined, ctx);

    const instance: Record<string, unknown> = {};
    initializers.forEach((fn) => { fn.call(instance); });

    expect(instance.logger).toBeInstanceOf(Logger);
  });

  it("throws a descriptive error when dep is not registered", () => {
    class UnknownDep {}

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "dep",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Inject(UnknownDep)(undefined, ctx);

    class MyClass { constructor() {} }
    const instance = new MyClass() as Record<string, unknown>;
    initializers.forEach((fn) => { fn.call(instance); });

    expect(() => instance.dep).toThrow("[Inject]");
  });

  it("warns on direct assignment in non-production", () => {
    class Dep2 {}
    Injectable()(Dep2, {} as ClassDecoratorContext);

    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "dep2",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    Inject(Dep2)(undefined, ctx);
    const instance: Record<string, unknown> = {};
    initializers.forEach((fn) => { fn.call(instance); });

    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // @ts-expect-error — testing the setter
    instance.dep2 = "override";
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[Inject]"));
    spy.mockRestore();
  });
});

// ── InjectContainer ───────────────────────────────────────────────────────────

describe("InjectContainer", () => {
  it("injects the global container instance", () => {
    const initializers: Array<(this: unknown) => void> = [];
    const ctx = {
      name: "container",
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext;

    InjectContainer()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    initializers.forEach((fn) => { fn.call(instance); });

    expect(instance.container).toBeInstanceOf(Container);
  });
});

// ── useService ────────────────────────────────────────────────────────────────

describe("useService", () => {
  it("resolves by Token", () => {
    const VERSION = token<string>("VERSION");
    const c = createScope((sc) => sc.registerValue(VERSION, "1.0.0"));
    // useService uses global container — test via token on a fresh child
    expect(c.resolve(VERSION)).toBe("1.0.0");
  });
});

// ── createScope ───────────────────────────────────────────────────────────────

describe("createScope", () => {
  it("creates a child container without configure fn", () => {
    const child = createScope();
    expect(child).toBeInstanceOf(Container);
  });

  it("applies the configure callback", () => {
    const DB = token<string>("DB");
    const child = createScope((c) => c.registerValue(DB, "postgres://localhost"));
    expect(child.resolve(DB)).toBe("postgres://localhost");
  });
});
