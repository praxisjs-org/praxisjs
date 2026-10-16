import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";

import { createMethodDecorator } from "../create-method-decorator";
import { Emit } from "../events/emit";
import { Bind } from "../functions/bind";
import { Log } from "../functions/log";
import { Memo } from "../functions/memo";
import { Once } from "../functions/once";
import { Throttle } from "../functions/throttle";
import { Until } from "../functions/until";
import { State } from "../properties/state";

describe("method decorators on real classes", () => {
  it("define nothing on the instance until the method is read", () => {
    class Counter extends StatefulComponent {
      @Once() init() { return 1; }
      render() { return null; }
    }
    const counter = new Counter();
    expect(Object.hasOwn(counter, "init")).toBe(false);
    expect(counter.init()).toBe(1);
    expect(Object.hasOwn(counter, "init")).toBe(true);
  });

  it("return the same bound function on every read, so detached calls keep their instance", () => {
    class Counter extends StatefulComponent {
      count = 0;
      @Bind() increment() { this.count++; }
      render() { return null; }
    }
    const a = new Counter();
    const b = new Counter();
    const increment = a.increment;
    expect(a.increment).toBe(increment);
    expect(b.increment).not.toBe(increment);
    increment();
    increment();
    b.increment();
    expect(a.count).toBe(2);
    expect(b.count).toBe(1);
  });

  it("keep per-instance state apart", () => {
    const original = vi.fn((n: number) => n * 2);
    class Calc extends StatefulComponent {
      @Once() once(n: number) { return original(n); }
      @Throttle(1000) tick() { return "tick"; }
      render() { return null; }
    }
    const a = new Calc();
    const b = new Calc();
    expect(a.once(1)).toBe(2);
    expect(a.once(5)).toBe(2);
    expect(b.once(3)).toBe(6);
    expect(a.tick()).toBe("tick");
    expect(a.tick()).toBeUndefined();
    expect(b.tick()).toBe("tick");
  });

  it("let a throwing @Once call be retried", () => {
    let fail = true;
    class Loader extends StatefulComponent {
      @Once() load() {
        if (fail) throw new Error("boom");
        return "ok";
      }
      render() { return null; }
    }
    const loader = new Loader();
    expect(() => loader.load()).toThrow("boom");
    fail = false;
    expect(loader.load()).toBe("ok");
    fail = true;
    expect(loader.load()).toBe("ok");
  });

  it("returns the unbound replacement when read from the prototype", () => {
    class Counter extends StatefulComponent {
      @Bind() increment() { return this; }
      render() { return null; }
    }
    new Counter();
    const fromPrototype = (Counter.prototype as unknown as { increment: () => unknown }).increment;
    expect(typeof fromPrototype).toBe("function");
    expect(Object.hasOwn(Counter.prototype, "constructor")).toBe(true);
    const counter = new Counter();
    expect(counter.increment()).toBe(counter);
  });

  it("lets the method be reassigned on an instance", () => {
    class Counter extends StatefulComponent {
      @Bind() read() { return "decorated"; }
      render() { return null; }
    }
    const counter = new Counter();
    counter.read = () => "patched";
    expect(counter.read()).toBe("patched");
    expect(new Counter().read()).toBe("decorated");
  });

  it("works when the first instance built is a subclass, and for the base class after", () => {
    class Base extends StatefulComponent {
      @Bind() who() { return this; }
      render() { return null; }
    }
    class Child extends Base {}
    const child = new Child();
    const base = new Base();
    const childWho = child.who;
    const baseWho = base.who;
    expect(childWho()).toBe(child);
    expect(baseWho()).toBe(base);
  });

  it("still installs on the base when a subclass overrides the method", () => {
    class Base extends StatefulComponent {
      @Bind() who() { return "base"; }
      render() { return null; }
    }
    class Child extends Base {
      who() { return `child>${super.who()}`; }
    }
    const child = new Child();
    expect(child.who()).toBe("child>base");
    expect(child.who()).toBe("child>base");
    expect(Object.hasOwn(child, "who")).toBe(false);
    const base = new Base();
    const who = base.who;
    expect(who()).toBe("base");
  });

  it("binds static methods to their class", () => {
    class Registry {
      static count = 0;
      @Bind() static add() { return ++this.count; }
    }
    const add = Registry.add;
    expect(add()).toBe(1);
    expect(add()).toBe(2);
  });

  it("decorates private methods without binding them", () => {
    class Counter extends StatefulComponent {
      @Once() #compute() { return Math.random(); }
      read() { return this.#compute(); }
      render() { return null; }
    }
    const counter = new Counter();
    expect(counter.read()).toBe(counter.read());
    expect(new Counter().read()).not.toBe(counter.read());
  });

  it("stacks built-in decorators, keeping every behavior", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const run = vi.fn(() => "ran");
      class Button extends StatefulComponent {
        @Log({ args: false }) @Throttle(1000) click() { return run(); }
        render() { return null; }
      }
      const button = new Button();
      const click = button.click;
      expect(click()).toBe("ran");
      expect(click()).toBeUndefined();
      expect(run).toHaveBeenCalledOnce();
      expect(log).toHaveBeenCalledTimes(2);
    } finally {
      log.mockRestore();
    }
  });

  it("treats @Bind over a binding decorator as a no-op", () => {
    const run = vi.fn();
    class Button extends StatefulComponent {
      @Bind() @Once() click() { run(this); }
      render() { return null; }
    }
    const button = new Button();
    const click = button.click;
    click();
    click();
    expect(run).toHaveBeenCalledExactlyOnceWith(button);
  });

  it("keeps a built-in decorator's behavior under an outer createMethodDecorator", () => {
    const calls: string[] = [];
    const Trace = createMethodDecorator({
      wrap: (original, instance) => (...args: unknown[]) => {
        calls.push("trace");
        return original.apply(instance, args) as unknown;
      },
    });
    const onSelect = vi.fn();
    class Row extends StatefulComponent {
      @Trace @Emit("onSelect") select() { return 7; }
      render() { return null; }
    }
    const row = new Row({ onSelect });
    expect(row.select()).toBe(7);
    expect(calls).toEqual(["trace"]);
    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it("caches @Memo results per instance", () => {
    const compute = vi.fn((n: number) => n + 1);
    class Calc extends StatefulComponent {
      @Memo() plusOne(n: number) { return compute(n); }
      render() { return null; }
    }
    const a = new Calc();
    const b = new Calc();
    expect(a.plusOne(1)).toBe(2);
    expect(a.plusOne(1)).toBe(2);
    expect(b.plusOne(1)).toBe(2);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it("keys @Memo results by every argument", () => {
    const compute = vi.fn((a: number, b: string) => `${String(a)}${b}`);
    class Calc extends StatefulComponent {
      @Memo() join(a: number, b: string) { return compute(a, b); }
      render() { return null; }
    }
    const calc = new Calc();
    expect(calc.join(1, "a")).toBe("1a");
    expect(calc.join(1, "b")).toBe("1b");
    expect(calc.join(1, "a")).toBe("1a");
    expect(compute).toHaveBeenCalledTimes(2);
  });
});

describe("@Until on a @State field", () => {
  it("resolves once the state field becomes truthy", async () => {
    class Profile extends StatefulComponent {
      @State() user: { name: string } | null = null;
      @Until("user") waitForUser(): Promise<{ name: string }> {
        return Promise.reject(new Error("replaced"));
      }
      render() { return null; }
    }

    const profile = new Profile();
    const pending = profile.waitForUser();
    profile.user = { name: "Ada" };
    await expect(pending).resolves.toEqual({ name: "Ada" });
  });

  it("resolves right away when the state field is already truthy", async () => {
    class Profile extends StatefulComponent {
      @State() ready = true;
      @Until("ready") whenReady(): Promise<boolean> { return Promise.resolve(false); }
      render() { return null; }
    }
    await expect(new Profile().whenReady()).resolves.toBe(true);
  });

  it("can be spied on with vi.spyOn before and after the method is first read", () => {
    class Plain extends StatefulComponent {
      count = 0;
      render() { return null; }
      @Bind() save() { this.count++; return this.count; }
      @Emit("onChange") toggle(value: string) { this.save(); return value; }
      click(value: string) { return this.toggle(value); }
    }
    const descriptor = Object.getOwnPropertyDescriptor(Plain.prototype, "save");
    const fresh = new Plain();
    expect(typeof Object.getOwnPropertyDescriptor(Plain.prototype, "save")?.get?.call(undefined)).toBe("function");
    expect(descriptor?.value).toBeTypeOf("function");

    const toggleSpy = vi.spyOn(fresh, "toggle");
    const saveSpy = vi.spyOn(fresh, "save");
    expect(fresh.click("a")).toBe("a");
    expect(toggleSpy).toHaveBeenCalledWith("a");
    expect(saveSpy).toHaveBeenCalledOnce();
    expect(fresh.count).toBe(1);
    saveSpy.mockReturnValue(42);
    expect(fresh.save()).toBe(42);
    toggleSpy.mockRestore();
    saveSpy.mockRestore();
    const save = fresh.save;
    save();
    expect(fresh.count).toBe(2);
    expect(fresh.save).toBe(save);

    const read = new Plain();
    const bound = read.save;
    const spy = vi.spyOn(read, "save");
    read.click("b");
    expect(spy).toHaveBeenCalledOnce();
    expect(read.count).toBe(1);
    spy.mockRestore();
    expect(read.save).toBe(bound);
  });
});
