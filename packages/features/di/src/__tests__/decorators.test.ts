import { describe, it, expect, vi } from "vitest";

import { Container, container, token } from "../container";
import { Injectable, Inject, InjectContainer, Scope } from "../decorators";

function makeFieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) {
        initializers.push(fn);
      },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) {
      initializers.forEach((fn) => {
        fn.call(instance);
      });
    },
  };
}

// ── @Injectable ───────────────────────────────────────────────────────────────

describe("Injectable", () => {
  it("with no arguments — defaults to singleton scope", () => {
    @Injectable()
    class SingletonByDefault {}
    const a = container.resolve(SingletonByDefault);
    const b = container.resolve(SingletonByDefault);
    expect(a).toBe(b);
  });

  it("registers the class in the global container", () => {
    @Injectable()
    class MyService {
      greet() {
        return "hello";
      }
    }
    expect(container.resolve(MyService)).toBeInstanceOf(MyService);
    expect(container.resolve(MyService).greet()).toBe("hello");
  });

  it("registers with transient scope — each resolve returns a new instance", () => {
    @Injectable({ scope: "transient" })
    class TmpService {}
    expect(container.resolve(TmpService)).not.toBe(
      container.resolve(TmpService),
    );
  });
});

// ── @Inject ───────────────────────────────────────────────────────────────────

describe("Inject", () => {
  it("injects a registered service via property", () => {
    @Injectable()
    class Logger {
      log(msg: string) {
        return msg;
      }
    }

    const { ctx, run } = makeFieldCtx("logger");
    Inject(Logger)(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.logger).toBeInstanceOf(Logger);
    // second access covers the cache-hit branch (line 62: !cache.has(this) === false)
    expect(instance.logger).toBe(instance.logger);
  });

  it("throws a descriptive error when dep is not registered", () => {
    class UnknownDep {}
    const { ctx, run } = makeFieldCtx("dep");
    Inject(UnknownDep)(undefined, ctx);
    class MyClass {}
    const instance = new MyClass() as Record<string, unknown>;
    run(instance);
    expect(() => instance.dep).toThrow("[Inject]");
  });

  it("warns on direct assignment in non-production", () => {
    @Injectable()
    class Dep2 {}
    const { ctx, run } = makeFieldCtx("dep2");
    Inject(Dep2)(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    instance.dep2 = "override";
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("[Inject]"));
    spy.mockRestore();
  });

  it("returns cached value on second access (cache hit)", () => {
    @Injectable()
    class CachedService {
      id = Math.random();
    }

    const { ctx, run } = makeFieldCtx("svc");
    Inject(CachedService)(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);

    const first = instance.svc;
    const second = instance.svc;
    expect(first).toBe(second); // same cached instance
  });

  it("does not warn on direct assignment in production mode", () => {
    @Injectable()
    class ProdDep {}
    const { ctx, run } = makeFieldCtx("dep");
    Inject(ProdDep)(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);

    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    instance.dep = "override";
    expect(spy).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
    spy.mockRestore();
  });

  it("includes the Token description in the error when resolution fails", () => {
    const MY_TOKEN = token<string>("MY_SERVICE");
    const { ctx, run } = makeFieldCtx("svc");
    Inject(MY_TOKEN)(undefined, ctx);
    class Consumer {}
    const instance = new Consumer() as Record<string, unknown>;
    run(instance);
    expect(() => instance.svc).toThrow("MY_SERVICE");
  });

  it("@Inject on an anonymous class — error message uses token description instead of empty class name", () => {
    const ANON_TOKEN = token<string>("ANON_TOKEN");
    const { ctx, run } = makeFieldCtx("val");
    Inject(ANON_TOKEN)(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(() => instance.val).toThrow("ANON_TOKEN");
  });
});

// ── @InjectContainer ──────────────────────────────────────────────────────────

describe("InjectContainer", () => {
  it("injects the global container on an unscoped class", () => {
    const { ctx, run } = makeFieldCtx("c");
    InjectContainer()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    expect(instance.c).toBeInstanceOf(Container);
    expect(instance.c).toBe(container);
  });

  it("called multiple times on same instance — returns same container instance (cached)", () => {
    const { ctx, run } = makeFieldCtx("c");
    InjectContainer()(undefined, ctx);
    const instance: Record<string, unknown> = {};
    run(instance);
    const first = instance.c;
    const second = instance.c;
    expect(first).toBe(second);
  });
});

// ── @Scope ────────────────────────────────────────────────────────────────────

describe("Scope", () => {
  it("creates a child container per instance", () => {
    @Scope()
    class Widget {}
    const { ctx, run } = makeFieldCtx("c");
    InjectContainer()(undefined, ctx);

    const a = new Widget() as Record<string, unknown>;
    run(a);
    const b = new Widget() as Record<string, unknown>;
    run(b);

    expect(a.c).toBeInstanceOf(Container);
    expect(b.c).toBeInstanceOf(Container);
    expect(a.c).not.toBe(b.c); // each instance gets its own scope
    expect(a.c).not.toBe(container); // it's a child, not the root
  });

  it("services registered in configure are resolvable within the scope", () => {
    const DB_URL = token<string>("DB_URL");

    @Scope((c) => {
      c.registerValue(DB_URL, "postgres://localhost");
    })
    class DataModule {}

    const { ctx, run } = makeFieldCtx("db");
    Inject(DB_URL)(undefined, ctx);

    const instance = new DataModule() as Record<string, unknown>;
    run(instance);

    expect(instance.db).toBe("postgres://localhost");
  });

  it("@Inject resolves from the scoped container, not the global one", () => {
    class ScopedRepo {}
    // NOT registered in global container
    const VERSION = token<string>("VERSION");

    @Scope((c) => {
      c.register(ScopedRepo);
      c.registerValue(VERSION, "2.0");
    })
    class App {}

    const { ctx: repoCtx, run: runRepo } = makeFieldCtx("repo");
    Inject(ScopedRepo)(undefined, repoCtx);
    const { ctx: verCtx, run: runVer } = makeFieldCtx("version");
    Inject(VERSION)(undefined, verCtx);

    const instance = new App() as Record<string, unknown>;
    runRepo(instance);
    runVer(instance);

    expect(instance.repo).toBeInstanceOf(ScopedRepo);
    expect(instance.version).toBe("2.0");
  });

  it("@InjectContainer returns the scoped child container", () => {
    @Scope((c) => {
      c.registerValue(token<number>("X"), 42);
    })
    class Service {}

    const { ctx, run } = makeFieldCtx("container");
    InjectContainer()(undefined, ctx);

    const instance = new Service() as Record<string, unknown>;
    run(instance);

    expect(instance.container).toBeInstanceOf(Container);
    expect(instance.container).not.toBe(container);
  });

  it("child container inherits registrations from the parent", () => {
    @Injectable()
    class GlobalService {}

    @Scope()
    class Child {}

    const { ctx, run } = makeFieldCtx("svc");
    Inject(GlobalService)(undefined, ctx);
    const instance = new Child() as Record<string, unknown>;
    run(instance);

    expect(instance.svc).toBeInstanceOf(GlobalService);
  });

  it("@Scope on child class that inherits from @Scope parent — child gets own container", () => {
    const PARENT_TOKEN = token<string>("PARENT_VAL");
    const CHILD_TOKEN = token<string>("CHILD_VAL");

    @Scope((c) => {
      c.registerValue(PARENT_TOKEN, "parent");
    })
    class Parent {}

    @Scope((c) => {
      c.registerValue(CHILD_TOKEN, "child");
    })
    class Child extends (Parent as unknown as new () => object) {}

    const { ctx: ctxC, run: runC } = makeFieldCtx("c");
    InjectContainer()(undefined, ctxC);

    const parentInstance = new Parent() as Record<string, unknown>;
    runC(parentInstance);

    const childInstance = new Child() as Record<string, unknown>;
    runC(childInstance);

    expect(parentInstance.c).toBeInstanceOf(Container);
    expect(childInstance.c).toBeInstanceOf(Container);
    // child has its own scoped container, different from the parent's
    expect(childInstance.c).not.toBe(parentInstance.c);
    expect(childInstance.c).not.toBe(container);
  });
});
