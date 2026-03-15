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
    const wrapped = Once()(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    expect(wrapped.call(obj)).toBe(42);
    expect(wrapped.call(obj)).toBe(42);
    expect(original).toHaveBeenCalledTimes(1);
  });

  it("returns the same result on subsequent calls", () => {
    let counter = 0;
    const original = () => ++counter;
    const ctx = mockMethodContext("inc");
    const wrapped = Once()(original, ctx as unknown as ClassMethodDecoratorContext);

    const obj = {};
    wrapped.call(obj);
    wrapped.call(obj);
    wrapped.call(obj);
    expect(counter).toBe(1);
  });

  it("is per-instance — different instances call independently", () => {
    const original = vi.fn(() => "result");
    const ctx = mockMethodContext("fn");
    const wrapped = Once()(original, ctx as unknown as ClassMethodDecoratorContext);

    const a = {};
    const b = {};
    wrapped.call(a);
    wrapped.call(b);
    expect(original).toHaveBeenCalledTimes(2);
  });
});

// ── Retry ─────────────────────────────────────────────────────────────────────

describe("Retry", () => {
  it("returns result if the first attempt succeeds", async () => {
    const original = vi.fn(async () => "ok");
    const ctx = mockMethodContext("fetch");
    const wrapped = Retry(3)(original, ctx as unknown as ClassMethodDecoratorContext);

    const result = await wrapped.call({});
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
    const wrapped = Retry(3)(original, ctx as unknown as ClassMethodDecoratorContext);

    const result = await wrapped.call({});
    expect(result).toBe("success");
    expect(original).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all attempts", async () => {
    const original = vi.fn(async () => {
      throw new Error("always fails");
    });
    const ctx = mockMethodContext("bad");
    const wrapped = Retry(3)(original, ctx as unknown as ClassMethodDecoratorContext);

    await expect(wrapped.call({})).rejects.toThrow("always fails");
    expect(original).toHaveBeenCalledTimes(3);
  });

  it("applies delay+backoff between retries", async () => {
    vi.useFakeTimers();
    const original = vi.fn(async () => { throw new Error("fail"); });
    const ctx = mockMethodContext("delayed");
    const wrapped = Retry(3, { delay: 100, backoff: 2 })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );
    const p = wrapped.call({});
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
    const wrapped = Retry(3, { onRetry })(original, ctx as unknown as ClassMethodDecoratorContext);

    await expect(wrapped.call({})).rejects.toThrow();
    expect(onRetry).toHaveBeenCalledTimes(2); // attempts 1 and 2, not the last
  });
});

// ── Log ──────────────────────────────────────────────────────────────────────

describe("Log", () => {
  it("calls the original function and returns its value", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(() => 99);
    const ctx = mockMethodContext("myMethod");
    const wrapped = Log({ args: false, result: false })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Dummy {}
    const result = wrapped.call(new Dummy());
    expect(result).toBe(99);
    spy.mockRestore();
  });

  it("logs args when args=true", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn((x: unknown) => x);
    const ctx = mockMethodContext("greet");
    const wrapped = Log({ args: true, result: false })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Foo {}
    wrapped.call(new Foo(), "hello");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("args:"), ["hello"]);
    spy.mockRestore();
  });

  it("does not log in production when devOnly=true", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(() => "value");
    const ctx = mockMethodContext("prod");
    const wrapped = Log({ devOnly: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    class App {}
    wrapped.call(new App());
    expect(spy).not.toHaveBeenCalled();

    process.env.NODE_ENV = prevEnv;
    spy.mockRestore();
  });

  it("handles async functions — logs resolved value", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const original = vi.fn(async () => "async-result");
    const ctx = mockMethodContext("load");
    const wrapped = Log({ args: false, result: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );

    class Svc {}
    await wrapped.call(new Svc());
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
    const wrapped = Log({ args: false, result: true })(
      original,
      ctx as unknown as ClassMethodDecoratorContext,
    );
    class Svc {}
    await expect(wrapped.call(new Svc())).rejects.toThrow("async-error");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("rejected:"),
      expect.any(Error),
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
});
