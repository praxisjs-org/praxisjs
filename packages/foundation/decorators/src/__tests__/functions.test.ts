import { describe, it, expect, vi } from "vitest";

import { Bind } from "../functions/bind";
import { Debounce } from "../functions/debounce";
import { Log } from "../functions/log";
import { Once } from "../functions/once";
import { Retry } from "../functions/retry";
import { Throttle } from "../functions/throttle";

// Helpers to simulate TC39 decorator context
function mockMethodContext(name: string) {
  const initializers: Array<(this: object) => void> = [];
  const ctx = {
    name,
    kind: "method" as const,
    addInitializer(fn: (this: object) => void) {
      initializers.push(fn);
    },
    runInitializers(instance: object) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
  return ctx;
}

// ── Once ─────────────────────────────────────────────────────────────────────

describe("Once", () => {
  it("only calls the original function once", () => {
    const original = vi.fn(() => 42);
    const ctx = mockMethodContext("doSomething");
    Once()(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => unknown>).doSomething;

    expect(method()).toBe(42);
    expect(method()).toBe(42);
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("returns the same result on subsequent calls", () => {
    let counter = 0;
    const original = () => ++counter;
    const ctx = mockMethodContext("inc");
    Once()(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => unknown>).inc;

    method();
    method();
    method();
    expect(counter).toBe(1);
  });

  it("is per-instance — different instances call independently", () => {
    const original = vi.fn(() => "result");
    const ctx = mockMethodContext("fn");
    Once()(original, ctx as unknown as ClassMethodDecoratorContext);

    const a = {};
    const b = {};
    ctx.runInitializers(a);
    ctx.runInitializers(b);

    const methodA = (a as Record<string, () => unknown>).fn;
    const methodB = (b as Record<string, () => unknown>).fn;
    methodA();
    methodB();
    expect(original).toHaveBeenCalledTimes(2);
  });
});

// ── Retry ─────────────────────────────────────────────────────────────────────

describe("Retry", () => {
  it("returns result if the first attempt succeeds", async () => {
    const original = vi.fn(async () => "ok");
    const ctx = mockMethodContext("fetch");
    Retry(3)(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).fetch;

    const result = await method();
    expect(result).toBe("ok");
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("retries and succeeds on a later attempt", async () => {
    let attempt = 0;
    const original = vi.fn(async () => {
      attempt++;
      if (attempt < 3) throw new Error("fail");
      return "success";
    });
    const ctx = mockMethodContext("call");
    Retry(3)(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).call;

    const result = await method();
    expect(result).toBe("success");
    expect(original).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all attempts", async () => {
    const original = vi.fn(async () => {
      throw new Error("always fails");
    });
    const ctx = mockMethodContext("bad");
    Retry(3)(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).bad;

    await expect(method()).rejects.toThrow("always fails");
    expect(original).toHaveBeenCalledTimes(3);
  });

  it("applies delay+backoff between retries", async () => {
    vi.useFakeTimers();
    const original = vi.fn(async () => { throw new Error("fail"); });
    const ctx = mockMethodContext("delayed");
    Retry(3, { delay: 100, backoff: 2 })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).delayed;

    const p = method();
    const rejection = expect(p).rejects.toThrow("fail");
    await vi.runAllTimersAsync();
    await rejection;
    expect(original).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("calls onRetry callback for each failed attempt (except last)", async () => {
    const onRetry = vi.fn();
    const original = vi.fn(async () => {
      throw new Error("err");
    });
    const ctx = mockMethodContext("op");
    Retry(3, { onRetry })(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).op;

    await expect(method()).rejects.toThrow();
    expect(onRetry).toHaveBeenCalledTimes(2); // attempts 1 and 2, not the last
  });

  it("maxAttempts=1 fails immediately without retrying", async () => {
    const original = vi.fn(async () => { throw new Error("instant fail"); });
    const ctx = mockMethodContext("once");
    Retry(1)(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).once;

    await expect(method()).rejects.toThrow("instant fail");
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("non-Error throw is wrapped in an Error", async () => {
    const original = vi.fn(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "string error";
    });
    const ctx = mockMethodContext("strThrow");
    Retry(1)(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).strThrow;

    await expect(method()).rejects.toThrow("string error");
  });

  it("maxAttempts=0 throws immediately without calling the function", async () => {
    const original = vi.fn(async () => "ok");
    const ctx = mockMethodContext("never");
    Retry(0)(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).never;

    await expect(method()).rejects.toThrow("Unknown error");
    expect(original).not.toHaveBeenCalled();
  });

  it("onRetry receives the correct attempt number", async () => {
    const attempts: number[] = [];
    const original = vi.fn(async () => { throw new Error("fail"); });
    const ctx = mockMethodContext("numbered");
    Retry(3, {
      onRetry: (_err, attempt) => { attempts.push(attempt); },
    })(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).numbered;

    await expect(method()).rejects.toThrow();
    expect(attempts).toEqual([1, 2]); // attempt 1 failed → onRetry(1), attempt 2 failed → onRetry(2)
  });

  it("backoff multiplies delay correctly", async () => {
    vi.useFakeTimers();
    const callTimes: number[] = [];
    const original = vi.fn(async () => {
      callTimes.push(Date.now());
      throw new Error("fail");
    });
    const ctx = mockMethodContext("backoffTest");
    Retry(3, { delay: 100, backoff: 2 })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, () => Promise<unknown>>).backoffTest;

    const p = method();
    const rejection = expect(p).rejects.toThrow("fail");
    await vi.runAllTimersAsync();
    await rejection;

    expect(callTimes.length).toBe(3);
    // Attempt 2 runs 100ms after attempt 1
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(100);
    // Attempt 3 runs 200ms after attempt 2 (backoff × 2)
    expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(200);
    vi.useRealTimers();
  });
});

// ── Log ──────────────────────────────────────────────────────────────────────

describe("Log", () => {
  it("calls the original function and returns its value", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(() => 99);
    const ctx = mockMethodContext("myMethod");
    Log({ args: false, result: false })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Dummy {}
    const dummy = new Dummy();
    ctx.runInitializers(dummy);
    const method = (dummy as Record<string, () => unknown>).myMethod;

    const result = method();
    expect(result).toBe(99);
    spy.mockRestore();
  });

  it("logs args when args=true", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn((x: unknown) => x);
    const ctx = mockMethodContext("greet");
    Log({ args: true, result: false })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Foo {}
    const foo = new Foo();
    ctx.runInitializers(foo);
    const method = (foo as Record<string, (...a: unknown[]) => unknown>).greet;

    method("hello");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("args:"), ["hello"]);
    spy.mockRestore();
  });

  it("does not log in production when devOnly=true", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(() => "value");
    const ctx = mockMethodContext("prod");
    Log({ devOnly: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    class App {}
    const app = new App();
    ctx.runInitializers(app);
    const method = (app as Record<string, () => unknown>).prod;

    method();
    expect(spy).not.toHaveBeenCalled();

    process.env.NODE_ENV = prevEnv;
    spy.mockRestore();
  });

  it("handles async functions — logs resolved value", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(async () => "async-result");
    const ctx = mockMethodContext("load");
    Log({ args: false, result: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Svc {}
    const svc = new Svc();
    ctx.runInitializers(svc);
    const method = (svc as Record<string, () => Promise<unknown>>).load;

    await method();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("resolved:"),
      "async-result",
      expect.any(String),
    );
    spy.mockRestore();
  });

  it("handles async rejection — logs rejected value and re-throws", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(async () => { throw new Error("async-error"); });
    const ctx = mockMethodContext("failing");
    Log({ args: false, result: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Svc {}
    const svc = new Svc();
    ctx.runInitializers(svc);
    const method = (svc as Record<string, () => Promise<unknown>>).failing;

    await expect(method()).rejects.toThrow("async-error");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("rejected:"),
      expect.any(Error),
    );
    spy.mockRestore();
  });
});

// ── Log (additional branches) ─────────────────────────────────────────────────

describe("Log — time option", () => {
  it("includes elapsed time in sync result log when time=true", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(() => "value");
    const ctx = mockMethodContext("timed");
    Log({ args: false, result: true, time: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Svc {}
    const svc = new Svc();
    ctx.runInitializers(svc);
    const method = (svc as Record<string, () => unknown>).timed;

    method();
    // Third argument should be a string containing "ms"
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("returned:"),
      "value",
      expect.stringContaining("ms"),
    );
    spy.mockRestore();
  });

  it("includes elapsed time in async result log when time=true", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(async () => "async-val");
    const ctx = mockMethodContext("asyncTimed");
    Log({ args: false, result: true, time: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Svc {}
    const svc = new Svc();
    ctx.runInitializers(svc);
    const method = (svc as Record<string, () => Promise<unknown>>).asyncTimed;

    await method();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("resolved:"),
      "async-val",
      expect.stringContaining("ms"),
    );
    spy.mockRestore();
  });

  it("skips result log when result=false", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(() => 42);
    const ctx = mockMethodContext("noResult");
    Log({ args: false, result: false })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Svc {}
    const svc = new Svc();
    ctx.runInitializers(svc);
    const method = (svc as Record<string, () => unknown>).noResult;

    method();
    // Should not log a "returned:" line
    const calls = spy.mock.calls.flat().join(" ");
    expect(calls).not.toContain("returned:");
    spy.mockRestore();
  });

  it("skips resolved log when result=false for async functions", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(async () => "async-value");
    const ctx = mockMethodContext("asyncNoResult");
    Log({ args: false, result: false })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Svc {}
    const svc = new Svc();
    ctx.runInitializers(svc);
    const method = (svc as Record<string, () => Promise<unknown>>).asyncNoResult;

    const result = await method();
    expect(result).toBe("async-value");
    const calls = spy.mock.calls.flat().join(" ");
    expect(calls).not.toContain("resolved:");
    spy.mockRestore();
  });

  it("uses 'Unknown' as class name when constructor.name is undefined", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(() => "val");
    const ctx = mockMethodContext("m");
    Log({ args: false, result: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    // Construct an object whose constructor.name is undefined to trigger ?? "Unknown"
    const fakeInstance = Object.assign(Object.create(null) as object, {
      constructor: { name: undefined },
    });
    ctx.runInitializers(fakeInstance);
    const method = (fakeInstance as Record<string, () => unknown>).m;

    method();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Unknown"),
      expect.anything(),
      expect.anything(),
    );
    spy.mockRestore();
  });
});

// ── Bind ─────────────────────────────────────────────────────────────────────

describe("Bind", () => {
  it("binds method to the instance so 'this' is preserved", () => {
    class Counter {
      value = 10;
      getValue() {
        return this.value;
      }
    }
    const ctx = mockMethodContext("getValue");
    Bind()(Counter.prototype.getValue, ctx as unknown as ClassMethodDecoratorContext);

    const c = new Counter();
    ctx.runInitializers(c);

    const detached = (c as unknown as Record<string, () => number>).getValue;
    expect(detached()).toBe(10);
  });
});

// ── Debounce ─────────────────────────────────────────────────────────────────

describe("Debounce", () => {
  it("defers execution until after the wait period", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const ctx = mockMethodContext("search");
    Debounce(100)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => void>).search;

    method("a");
    method("b");
    method("c");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("c");
    vi.useRealTimers();
  });

  it("resets the timer on each call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const ctx = mockMethodContext("onInput");
    Debounce(50)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => void>).onInput;

    method("x");
    vi.advanceTimersByTime(30);
    method("y");
    vi.advanceTimersByTime(30); // 30ms since last call — not enough
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20); // now 50ms since "y"
    expect(fn).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("multiple instances have independent timers", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const ctx = mockMethodContext("act");
    Debounce(100)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj1 = {};
    const obj2 = {};
    ctx.runInitializers(obj1);
    ctx.runInitializers(obj2);

    const m1 = (obj1 as Record<string, (...a: unknown[]) => void>).act;
    const m2 = (obj2 as Record<string, (...a: unknown[]) => void>).act;

    m1("from-1");
    m2("from-2");

    vi.advanceTimersByTime(100);
    // Both timers fire independently
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith("from-1");
    expect(fn).toHaveBeenCalledWith("from-2");
    vi.useRealTimers();
  });

  it("delay=0 fires after the next macrotask", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const ctx = mockMethodContext("instant");
    Debounce(0)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => void>).instant;

    method("a");
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
    vi.useRealTimers();
  });
});

// ── Throttle ─────────────────────────────────────────────────────────────────

describe("Throttle", () => {
  it("executes the first call immediately", () => {
    vi.useFakeTimers();
    const fn = vi.fn(() => "first");
    const ctx = mockMethodContext("save");
    Throttle(100)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => void>).save;

    method();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("ignores calls within the throttle window", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const ctx = mockMethodContext("scroll");
    Throttle(100)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => void>).scroll;

    method();
    method();
    method();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("allows a new call after the window expires", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const ctx = mockMethodContext("resize");
    Throttle(100)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => void>).resize;

    method();
    vi.advanceTimersByTime(100);
    method();
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("passes the first call's arguments to the underlying function", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const ctx = mockMethodContext("click");
    Throttle(100)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    ctx.runInitializers(obj);
    const method = (obj as Record<string, (...a: unknown[]) => void>).click;

    method("first-arg");
    method("second-arg");
    expect(fn).toHaveBeenCalledWith("first-arg");
    vi.useRealTimers();
  });

  it("multiple instances throttle independently", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const ctx = mockMethodContext("ping");
    Throttle(100)(fn, ctx as unknown as ClassMethodDecoratorContext);

    const obj1 = {};
    const obj2 = {};
    ctx.runInitializers(obj1);
    ctx.runInitializers(obj2);

    const m1 = (obj1 as Record<string, (...a: unknown[]) => void>).ping;
    const m2 = (obj2 as Record<string, (...a: unknown[]) => void>).ping;

    m1("a");
    m2("b");
    // Both first calls go through
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
