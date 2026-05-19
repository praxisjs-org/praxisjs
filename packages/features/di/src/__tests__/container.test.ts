import { describe, it, expect } from "vitest";

import { Container, Token, token, type Constructor } from "../container";

describe("Token", () => {
  it("stores description", () => {
    const t = new Token("MY_SERVICE");
    expect(t.description).toBe("MY_SERVICE");
  });

  it("toString includes description", () => {
    const t = new Token("FOO");
    expect(t.toString()).toBe("Token(FOO)");
  });

  it("token() factory creates a Token", () => {
    const t = token<string>("DB_URL");
    expect(t).toBeInstanceOf(Token);
    expect(t.description).toBe("DB_URL");
  });
});

describe("Container", () => {
  it("registers and resolves a singleton service", () => {
    class MyService {}
    const c = new Container();
    c.register(MyService);
    const a = c.resolve(MyService);
    const b = c.resolve(MyService);
    expect(a).toBeInstanceOf(MyService);
    expect(a).toBe(b); // singleton
  });

  it("creates new instance for transient scope", () => {
    class Counter {
      value = Math.random();
    }
    const c = new Container();
    c.register(Counter, { scope: "transient" });
    const a = c.resolve(Counter);
    const b = c.resolve(Counter);
    expect(a).not.toBe(b);
  });

  it("throws when resolving unregistered service", () => {
    class Unknown {}
    const c = new Container();
    expect(() => c.resolve(Unknown)).toThrow("[DI] Service not registered");
  });

  it("registerValue stores a value by token", () => {
    const DB_URL = token<string>("DB_URL");
    const c = new Container();
    c.registerValue(DB_URL, "postgres://localhost/db");
    expect(c.resolve(DB_URL)).toBe("postgres://localhost/db");
  });

  it("registerFactory computes value via factory", () => {
    const MAX = token<number>("MAX");
    const c = new Container();
    c.registerFactory(MAX, () => 100);
    expect(c.resolve(MAX)).toBe(100);
  });

  it("throws for unregistered token", () => {
    const t = token<string>("MISSING");
    const c = new Container();
    expect(() => c.resolve(t)).toThrow("[DI] Token not registered");
  });

  it("child container resolves from parent", () => {
    const URL_TOKEN = token<string>("URL");
    const parent = new Container();
    parent.registerValue(URL_TOKEN, "https://example.com");
    const child = parent.createChild();
    expect(child.resolve(URL_TOKEN)).toBe("https://example.com");
  });

  it("child container can override parent registration", () => {
    const URL_TOKEN = token<string>("URL");
    const parent = new Container();
    parent.registerValue(URL_TOKEN, "https://parent.com");
    const child = parent.createChild();
    child.registerValue(URL_TOKEN, "https://child.com");
    expect(child.resolve(URL_TOKEN)).toBe("https://child.com");
    expect(parent.resolve(URL_TOKEN)).toBe("https://parent.com");
  });

  it("register() is chainable", () => {
    class A {}
    class B {}
    const c = new Container();
    expect(c.register(A).register(B)).toBe(c);
  });

  it("parent singleton is reused when resolved from child container", () => {
    class SharedService {}
    const parent = new Container();
    parent.register(SharedService, { scope: "singleton" });
    const child = parent.createChild();

    const fromChild = child.resolve(SharedService);
    const fromParent = parent.resolve(SharedService);
    expect(fromChild).toBe(fromParent);
  });

  it("child container falls back to parent for unregistered service", () => {
    class MyDep {}
    const parent = new Container();
    parent.register(MyDep);
    const child = parent.createChild();
    expect(child.resolve(MyDep)).toBeInstanceOf(MyDep);
  });

  it("grandchild resolves from grandparent (three-level chain)", () => {
    const URL_TOKEN = token<string>("GRANDPARENT_URL");
    const grandparent = new Container();
    grandparent.registerValue(URL_TOKEN, "https://grandparent.com");
    const child = grandparent.createChild();
    const grandchild = child.createChild();
    expect(grandchild.resolve(URL_TOKEN)).toBe("https://grandparent.com");
  });

  it("registerFactory can resolve other services from the container", () => {
    class Logger {}
    const LOG_WRAP = token<{ logger: Logger }>("LOG_WRAP");
    const c = new Container();
    c.register(Logger);
    c.registerFactory(LOG_WRAP, (container) => ({
      logger: container.resolve(Logger),
    }));
    const result = c.resolve(LOG_WRAP);
    expect(result.logger).toBeInstanceOf(Logger);
  });

  it("registering the same class twice replaces the previous registration", () => {
    class Counter {
      value = Math.random();
    }
    const c = new Container();
    c.register(Counter, { scope: "singleton" });
    const first = c.resolve(Counter);

    // Re-register resets the descriptor (no cached instance)
    c.register(Counter, { scope: "singleton" });
    const second = c.resolve(Counter);

    // After re-registration, a new singleton is created
    expect(second).toBeInstanceOf(Counter);
    expect(second).not.toBe(first);
  });

  it("re-registering with different scope switches scope correctly", () => {
    class Svc {}
    const c = new Container();
    c.register(Svc, { scope: "singleton" });
    c.resolve(Svc); // warm up singleton

    c.register(Svc, { scope: "transient" });
    const a = c.resolve(Svc);
    const b = c.resolve(Svc);
    expect(a).toBeInstanceOf(Svc);
    expect(a).not.toBe(b);
  });

  it("factory function that throws — error message includes which service failed", () => {
    class Broken {
      constructor() {
        throw new Error("boom");
      }
    }
    const c = new Container();
    c.register(Broken);
    expect(() => c.resolve(Broken)).toThrow("Broken");
    expect(() => c.resolve(Broken)).toThrow("[DI] Failed to instantiate");
  });

  it("resolve() called concurrently on the same uninitialized singleton — returns same instance or does not crash", async () => {
    class SlowService {}
    const c = new Container();
    c.register(SlowService, { scope: "singleton" });

    const [a, b] = await Promise.all([
      Promise.resolve(c.resolve(SlowService)),
      Promise.resolve(c.resolve(SlowService)),
    ]);

    expect(a).toBeInstanceOf(SlowService);
    expect(a).toBe(b);
  });

  it("re-registering a service clears the previous singleton instance", () => {
    class Svc {
      id = Math.random();
    }
    const c = new Container();
    c.register(Svc, { scope: "singleton" });
    const first = c.resolve(Svc);

    c.register(Svc, { scope: "singleton" });
    const second = c.resolve(Svc);

    expect(second).not.toBe(first);
  });

  it("circular dependency chain including a Token shows the Token name in the error", () => {
    const MY_TOKEN = token<unknown>("MyToken");
    const c = new Container();
    c.registerValue(MY_TOKEN, "value");

    // Pre-populate the stack as if we are already in the middle of resolving MY_TOKEN
    const stack = new Set<Constructor | Token<unknown>>([MY_TOKEN]);
    expect(() => c.resolve(MY_TOKEN, stack)).toThrow("Token(MyToken)");
  });

  it("circular dependency chain with a Constructor shows the class name (k.name branch)", () => {
    class ServiceA {}
    const c = new Container();
    c.register(ServiceA);

    // Pre-populate the stack as if ServiceA is already being resolved
    const stack = new Set<Constructor | Token<unknown>>([ServiceA]);
    expect(() => c.resolve(ServiceA as never, stack)).toThrow("ServiceA");
  });

  it("instantiate rethrows DI errors thrown inside a constructor without wrapping", () => {
    const c = new Container();
    class Unregistered {}
    class Outer {
      constructor() {
        // Manually triggers a [DI] error inside the constructor body
        c.resolve(Unregistered);
      }
    }
    c.register(Outer);

    const err = (() => {
      try {
        c.resolve(Outer);
      } catch (e) {
        return e as Error;
      }
    })()!;
    expect(err.message).toMatch(/\[DI\] Service not registered/);
    expect(err.message).not.toMatch(/Failed to instantiate/);
  });
});
