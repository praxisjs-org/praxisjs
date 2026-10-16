import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { effect, readSignal, signal, SignalNode, writeSignal } from "@praxisjs/core/internal";

import { ClassBehavior, createClassDecorator, type ClassEnhancement } from "../create-class-decorator";
import { createFieldDecorator } from "../create-field-decorator";
import {
  createGetterDecorator,
  createGetterObserverDecorator,
  createWritableGetterDecorator,
} from "../create-getter-decorator";
import { createLifecycleMethodDecorator } from "../create-lifecycle-method-decorator";
import { createMethodDecorator } from "../create-method-decorator";
import { Once } from "../functions/once";
import { State } from "../properties/state";

type Slots = Record<symbol, unknown>;

describe("createFieldDecorator — setup form", () => {
  function Bounded(min: number, max: number) {
    return createFieldDecorator<object, number>({
      label: "@Bounded()",
      setup(name) {
        const node = Symbol(`bounded.${name}`);
        const fit = (value: number) => Math.min(max, Math.max(min, value));
        return {
          get(this: Slots) { return readSignal(this[node] as SignalNode<number>); },
          set(this: Slots, value) { writeSignal(this[node] as SignalNode<number>, fit(value)); },
          init(instance, initial) { (instance as Slots)[node] = new SignalNode(fit(initial)); },
        };
      },
    });
  }

  class Player extends StatefulComponent {
    @Bounded(0, 100) volume = 150;
    @Bounded(0, 10) level = 3;
    render() { return null; }
  }

  it("runs setup once per field and shares one accessor pair across instances", () => {
    const a = new Player();
    const b = new Player();
    const da = Object.getOwnPropertyDescriptor(a, "volume");
    const db = Object.getOwnPropertyDescriptor(b, "volume");
    expect(da?.get).toBe(db?.get);
    expect(da?.set).toBe(db?.set);
    expect(da?.enumerable).toBe(true);
    expect(Object.keys(a)).toContain("volume");
  });

  it("keeps per-instance state in the slots init created, starting from the initial value", () => {
    const a = new Player();
    const b = new Player();
    expect(a.volume).toBe(100);
    a.volume = -4;
    expect(a.volume).toBe(0);
    expect(b.volume).toBe(100);
    expect(a.level).toBe(3);
  });

  it("is reactive through the instance's signal", () => {
    const player = new Player();
    const seen: number[] = [];
    const stop = effect(() => { seen.push(player.level); });
    player.level = 7;
    stop();
    expect(seen).toEqual([3, 7]);
  });

  it("passes the field name and the decorator context to setup", () => {
    const setup = vi.fn(() => ({}));
    const decorator = createFieldDecorator({ setup });
    class Host {
      @decorator title = "x";
    }
    new Host();
    expect(setup).toHaveBeenCalledOnce();
    expect(setup.mock.calls[0]).toEqual(["title", expect.objectContaining({ kind: "field", name: "title" })]);
  });

  it("respects enumerable: false", () => {
    const hidden = createFieldDecorator({ setup: () => ({ get: () => 1, enumerable: false }) });
    class Host {
      @hidden secret = 0;
    }
    expect(Object.keys(new Host())).not.toContain("secret");
  });

  it("leaves a plain field when the setup installs no accessor", () => {
    const init = vi.fn();
    const observe = createFieldDecorator({ setup: () => ({ init }) });
    class Host {
      @observe count = 2;
    }
    const host = new Host();
    expect(Object.getOwnPropertyDescriptor(host, "count")).toEqual({ value: 2, writable: true, enumerable: true, configurable: true });
    expect(init).toHaveBeenCalledWith(host, 2);
  });

  it("lets init see the accessor of a decorator stacked under it, and keeps it without get/set", () => {
    const seen: unknown[] = [];
    const observe = createFieldDecorator({
      setup: (name) => ({
        init(instance) { seen.push(Object.getOwnPropertyDescriptor(instance, name)?.get); },
      }),
    });
    class Widget extends StatefulComponent {
      @observe @State() count = 1;
      render() { return null; }
    }
    const widget = new Widget();
    expect(seen[0]).toBeTypeOf("function");
    expect(Object.getOwnPropertyDescriptor(widget, "count")?.get).toBe(seen[0]);
    widget.count = 5;
    expect(widget.count).toBe(5);
  });

  it("runs onMount and onUnmount with the instance on every mount", () => {
    const log: string[] = [];
    const tracked = createFieldDecorator({
      setup: (name) => ({
        onMount(instance) { log.push(`mount:${name}:${String(instance instanceof Widget)}`); },
        onUnmount() { log.push(`unmount:${name}`); },
      }),
    });
    class Widget extends StatefulComponent {
      @tracked a = 1;
      render() { return null; }
    }
    const widget = new Widget();
    widget.onMount?.();
    widget.onUnmount?.();
    expect(log).toEqual(["mount:a:true", "unmount:a"]);
  });

  it("throws a clear error when setup returns nothing", () => {
    const broken = createFieldDecorator({ label: "@Broken()", setup: () => undefined as never });
    expect(() => {
      class Host {
        @broken value = 1;
      }
      return Host;
    }).toThrow("@Broken(): setup() must return an object (a FieldSetup), got undefined.");
  });

  it("names the decorator when it is put on another kind of member", () => {
    const decorator = createFieldDecorator({ label: "@Bounded()", setup: () => ({}) });
    expect(() => {
      class Host {
        // @ts-expect-error -- a field decorator on a method
        @decorator run() { return 1; }
      }
      return Host;
    }).toThrow('@Bounded() decorates class fields only, not the method "run".');
  });

  it("is rejected by the type checker on a field of the wrong type", () => {
    class Host {
      // @ts-expect-error -- @Bounded() takes number fields only
      @Bounded(0, 1) name = "x";
    }
    expect(new Host().name).toBeNaN();
  });
});

describe("createFieldDecorator — bind form", () => {
  it("throws a clear error when bind returns nothing", () => {
    const broken = createFieldDecorator({ label: "@Broken()", bind: () => undefined as never });
    class Host extends StatefulComponent {
      @broken value = 1;
      render() { return null; }
    }
    expect(() => new Host()).toThrow("@Broken(): bind() must return an object (a FieldBinding), got undefined.");
  });

  it("describes a function or an object returned where a binding was expected", () => {
    const fn = createFieldDecorator({ label: "@F()", bind: () => (() => 1) as never });
    class Host extends StatefulComponent {
      @fn value = 1;
      render() { return null; }
    }
    expect(() => new Host()).toThrow("@F(): bind() must return an object (a FieldBinding), got a function.");
    const Broken = createMethodDecorator({ label: "@M()", setup: () => ({ method: {} }) as never });
    expect(() => {
      class Other {
        @Broken run() { return 1; }
      }
      return Other;
    }).toThrow("@M(): setup() must return a function or { method }, got an object.");
  });

  it("defines additional properties next to the field", () => {
    const withLength = createFieldDecorator({
      bind: (instance, name) => ({
        additional: {
          [`${name}Length`]: { get: () => String((instance as unknown as Record<string, unknown>)[name]).length },
        },
      }),
    });
    class Host extends StatefulComponent {
      @withLength title = "hello";
      render() { return null; }
    }
    expect((new Host() as unknown as { titleLength: number }).titleLength).toBe(5);
  });
});

describe("createMethodDecorator — setup form", () => {
  it("replaces the method once per class and binds it to each instance on first read", () => {
    const setup = vi.fn((original: (this: object, ...args: unknown[]) => unknown) =>
      function (this: object, ...args: unknown[]) { return `<${String(original.apply(this, args))}>`; });
    const Wrap = createMethodDecorator({ setup });
    class Greeter {
      name = "Ada";
      @Wrap greet(greeting: string) { return `${greeting} ${this.name}`; }
    }
    const a = new Greeter();
    const b = new Greeter();
    expect(setup).toHaveBeenCalledOnce();
    expect(a.greet("hi")).toBe("<hi Ada>");
    const detached = b.greet;
    expect(detached("hey")).toBe("<hey Ada>");
    expect(b.greet).toBe(detached);
  });

  it("keeps per-instance state in symbol slots", () => {
    const count = Symbol("count");
    const Counted = createMethodDecorator({
      setup: (original) => function (this: Slots, ...args: unknown[]) {
        this[count] = ((this[count] as number | undefined) ?? 0) + 1;
        return original.apply(this, args) as unknown;
      },
    });
    class Host {
      @Counted run() { return 1; }
    }
    const a = new Host();
    const b = new Host();
    a.run();
    a.run();
    b.run();
    expect((a as unknown as Slots)[count]).toBe(2);
    expect((b as unknown as Slots)[count]).toBe(1);
  });

  it("runs the hooks of a MethodSetup on mount and unmount", () => {
    const log: string[] = [];
    const Tracked = createMethodDecorator({
      setup: (original, context) => ({
        method: original,
        onMount: () => { log.push(`mount:${String(context.name)}`); },
        onUnmount: () => { log.push(`unmount:${String(context.name)}`); },
      }),
    });
    class Widget extends StatefulComponent {
      @Tracked save() { return "saved"; }
      render() { return null; }
    }
    const widget = new Widget();
    widget.onMount?.();
    widget.onUnmount?.();
    expect(widget.save()).toBe("saved");
    expect(log).toEqual(["mount:save", "unmount:save"]);
  });

  it("accepts a MethodSetup without hooks", () => {
    const Same = createMethodDecorator({ setup: (original) => ({ method: original }) });
    class Host {
      @Same run() { return 3; }
    }
    expect(new Host().run()).toBe(3);
  });

  it("rejects hooks on a static method", () => {
    const Tracked = createMethodDecorator({ label: "@Tracked()", setup: (original) => ({ method: original, onMount() { /* */ } }) });
    expect(() => {
      class Host {
        @Tracked static run() { return 1; }
      }
      return Host;
    }).toThrow('@Tracked(): onMount/onUnmount need an instance method, not the static "run".');
  });

  it("throws a clear error when setup returns something other than a method", () => {
    const Broken = createMethodDecorator({ label: "@Broken()", setup: () => ({ method: 1 }) as never });
    expect(() => {
      class Host {
        @Broken run() { return 1; }
      }
      return Host;
    }).toThrow("@Broken(): setup() must return a function or { method }, got 1.");
  });

  it("names the decorator when it is put on a field", () => {
    const Wrap = createMethodDecorator({ label: "@Confirm()", setup: (original) => original });
    expect(() => {
      class Host {
        // @ts-expect-error -- a method decorator on a field
        @Wrap title = "";
      }
      return Host;
    }).toThrow('@Confirm() decorates methods only, not the field "title".');
  });
});

describe("createMethodDecorator — wrap form", () => {
  it("wraps each instance while it is built and calls through one shared replacement", () => {
    const wrap = vi.fn((original: (...args: unknown[]) => unknown, instance: object) =>
      (...args: unknown[]) => [instance, original.apply(instance, args)]);
    const Wrap = createMethodDecorator({ wrap });
    class Host extends StatefulComponent {
      @Wrap run(n: number) { return n * 2; }
      render() { return null; }
    }
    const host = new Host();
    expect(wrap).toHaveBeenCalledOnce();
    expect(Object.hasOwn(host, "run")).toBe(false);
    const detached = host.run;
    expect(detached(2)).toEqual([host, 4]);
  });

  it("keeps a built-in decorator stacked above it", () => {
    const calls = vi.fn();
    const Wrap = createMethodDecorator({
      wrap: (original) => function (this: object, ...args: unknown[]) { calls(); return original.apply(this, args) as unknown; },
    });
    class Host extends StatefulComponent {
      n = 0;
      @Once() @Wrap load() { return ++this.n; }
      render() { return null; }
    }
    const host = new Host();
    expect(host.load()).toBe(1);
    expect(host.load()).toBe(1);
    expect(calls).toHaveBeenCalledOnce();
  });

  it("wraps an object the constructor did not build on its first call", () => {
    const Wrap = createMethodDecorator({ wrap: (original) => original });
    class Host extends StatefulComponent {
      @Wrap run() { return "ran"; }
      render() { return null; }
    }
    new Host();
    const bare = Object.create(Host.prototype) as Host;
    expect(Host.prototype.run.call(bare)).toBe("ran");
  });

  it("throws a clear error when wrap returns something other than a function", () => {
    const Broken = createMethodDecorator({ label: "@Broken()", wrap: () => undefined as never });
    class Host extends StatefulComponent {
      @Broken run() { return 1; }
      render() { return null; }
    }
    expect(() => new Host()).toThrow("@Broken(): wrap() must return a function, got undefined.");
  });
});

describe("createLifecycleMethodDecorator", () => {
  it("passes the method name to register and accepts a register that returns nothing", () => {
    const names: string[] = [];
    const OnPing = createLifecycleMethodDecorator({
      register(_callback, _instance, name) { names.push(name); },
    });
    class Widget extends StatefulComponent {
      @OnPing ping() { /* */ }
      render() { return null; }
    }
    const widget = new Widget();
    widget.onMount?.();
    widget.onUnmount?.();
    expect(names).toEqual(["ping"]);
  });

  it("rejects static methods and other members, naming the decorator", () => {
    const OnPing = createLifecycleMethodDecorator({ label: "@OnPing()", register: () => undefined });
    expect(() => {
      class Host extends StatefulComponent {
        // @ts-expect-error -- lifecycle decorators need an instance method
        @OnPing static ping() { /* */ }
        render() { return null; }
      }
      return Host;
    }).toThrow('@OnPing() decorates instance methods only, not the static method "ping".');
    expect(() => {
      class Host extends StatefulComponent {
        // @ts-expect-error -- a method decorator on a getter
        @OnPing get ping() { return 1; }
        render() { return null; }
      }
      return Host;
    }).toThrow('@OnPing() decorates methods only, not the getter "ping".');
  });

  it("types the callback from Args", () => {
    const OnResize = createLifecycleMethodDecorator<StatefulComponent, [width: number]>({
      register(callback) { callback(320); },
    });
    const widths: number[] = [];
    class Layout extends StatefulComponent {
      @OnResize resize(width: number) { widths.push(width); }
      render() { return null; }
    }
    new Layout().onMount?.();
    expect(widths).toEqual([320]);
  });
});

describe("createGetterDecorator — setup form", () => {
  function Clamp(min: number, max: number) {
    return createGetterDecorator<object, number>({
      label: "@Clamp()",
      setup: (original) => function (this: object) { return Math.min(max, Math.max(min, original.call(this))); },
    });
  }

  it("returns a getter shared by every instance, installed on the class", () => {
    class Slider extends StatefulComponent {
      @State() raw = 0;
      @Clamp(0, 100) get value() { return this.raw; }
      render() { return null; }
    }
    const slider = new Slider();
    slider.raw = 150;
    expect(slider.value).toBe(100);
    expect(Object.getOwnPropertyDescriptor(slider, "value")).toBeUndefined();
  });

  it("uses the original getter when a GetterSetup has no get, and runs init and the hooks", () => {
    const log: string[] = [];
    const slot = Symbol("reads");
    const Tracked = createGetterDecorator({
      setup: () => ({
        init(instance) { (instance as Slots)[slot] = 0; },
        onMount() { log.push("mount"); },
        onUnmount() { log.push("unmount"); },
      }),
    });
    class Widget extends StatefulComponent {
      @Tracked get answer() { return 42; }
      render() { return null; }
    }
    const widget = new Widget();
    expect(widget.answer).toBe(42);
    expect((widget as unknown as Slots)[slot]).toBe(0);
    widget.onMount?.();
    widget.onUnmount?.();
    expect(log).toEqual(["mount", "unmount"]);
  });

  it("throws clear errors for a wrong setup result and for hooks on a static getter", () => {
    const nothing = createGetterDecorator({ label: "@G()", setup: () => undefined as never });
    const notFunction = createGetterDecorator({ label: "@G()", setup: () => ({ get: 1 }) as never });
    const staticHooks = createGetterDecorator({ label: "@G()", setup: () => ({ onMount() { /* */ } }) });
    expect(() => { class A { @nothing get x() { return 1; } } return A; }).toThrow(
      "@G(): setup() must return a getter or a GetterSetup object, got undefined.",
    );
    const nullish = createGetterDecorator({ label: "@G()", setup: () => null as never });
    expect(() => { class A { @nullish get x() { return 1; } } return A; }).toThrow(
      "@G(): setup() must return a getter or a GetterSetup object, got null.",
    );
    expect(() => { class A { @notFunction get x() { return 1; } } return A; }).toThrow(
      '@G(): setup() returned a "get" that is not a function.',
    );
    expect(() => { class A { @staticHooks static get x() { return 1; } } return A; }).toThrow(
      '@G(): onMount/onUnmount need an instance getter, not the static "x".',
    );
  });

  it("names the decorator on another kind of member", () => {
    expect(() => {
      class A {
        // @ts-expect-error -- a getter decorator on a method
        @Clamp(0, 1) x() { return 1; }
      }
      return A;
    }).toThrow('@Clamp() decorates getters only, not the method "x".');
  });

  it("names the decorator in the wrap form too", () => {
    const wrapped = createGetterDecorator({ label: "@W()", wrap: (original, instance) => () => original.call(instance) });
    expect(() => {
      class A {
        // @ts-expect-error -- a getter decorator on a field
        @wrapped x = 1;
      }
      return A;
    }).toThrow('@W() decorates getters only, not the field "x".');
  });
});

describe("createWritableGetterDecorator — setup form", () => {
  function Overridable() {
    return createWritableGetterDecorator({
      label: "@Overridable()",
      setup(original, context) {
        const override = Symbol(`override.${String(context.name)}`);
        return {
          get(this: Slots) {
            const pinned = readSignal(this[override] as SignalNode<unknown>);
            return pinned === undefined ? original.call(this) : pinned;
          },
          set(this: Slots, value) { writeSignal(this[override] as SignalNode<unknown>, value); },
          init(instance) { (instance as Slots)[override] = new SignalNode(undefined); },
        };
      },
    });
  }

  class Header extends StatefulComponent {
    @State() page = "Home";
    @Overridable() get title(): string | undefined { return this.page; }
    render() { return null; }
  }

  it("installs get and set once on the class that declares the getter", () => {
    class Sub extends Header {}
    const sub = new Sub();
    const header = new Header();
    (sub as { title?: string }).title = "Pinned";
    expect(sub.title).toBe("Pinned");
    expect(header.title).toBe("Home");
    (sub as { title?: string }).title = undefined;
    sub.page = "About";
    expect(sub.title).toBe("About");
    expect(Object.getOwnPropertyDescriptor(Header.prototype, "title")?.set).toBeTypeOf("function");
    expect(Object.hasOwn(Sub.prototype, "title")).toBe(false);
    expect(Object.hasOwn(sub, "title")).toBe(false);
  });

  it("replaces a set accessor the class declares for TypeScript's sake", () => {
    const declared = vi.fn();
    class Typed extends StatefulComponent {
      @State() page = "Home";
      @Overridable() get title(): string | undefined { return this.page; }
      set title(value: string | undefined) { declared(value); }
      render() { return null; }
    }
    const typed = new Typed();
    typed.title = "Pinned";
    expect(typed.title).toBe("Pinned");
    expect(declared).not.toHaveBeenCalled();
  });

  it("finds its class entry past a subclass that overrides the getter", () => {
    class Shouting extends Header {
      override get title() { return super.title?.toUpperCase(); }
      set title(value: string | undefined) { Reflect.set(Header.prototype, "title", value, this); }
    }
    const shouting = new Shouting();
    (shouting as { title?: string }).title = "pinned";
    expect(shouting.title).toBe("PINNED");
  });

  it("keeps the getter of a builder-made decorator stacked above it", () => {
    const Loud = createGetterDecorator({ setup: (original) => function (this: object) { return String(original.call(this)).toUpperCase(); } });
    class Page extends StatefulComponent {
      @State() page = "home";
      @Loud @Overridable() get title(): string { return this.page; }
      render() { return null; }
    }
    const page = new Page();
    expect(page.title).toBe("HOME");
    (page as { title: string }).title = "pinned";
    expect(page.title).toBe("PINNED");
  });

  it("falls back to each instance under a getter decorator it cannot see through", () => {
    const raw = (target: (this: object) => unknown) => function (this: object) { return `[${String(target.call(this))}]`; };
    class Page extends StatefulComponent {
      @State() page = "home";
      @raw @Overridable() get title(): string { return this.page; }
      render() { return null; }
    }
    const page = new Page();
    (page as { title: string }).title = "pinned";
    expect(page.title).toBe("[pinned]");
    expect(Object.hasOwn(page, "title")).toBe(true);
  });

  it("installs a static getter's setter on the class itself", () => {
    const store = signal(1);
    const Writable = createWritableGetterDecorator({ setup: () => ({ set(value) { store.set(value as number); } }) });
    class Config {
      @Writable static get level() { return store(); }
    }
    (Config as { level: number }).level = 4;
    expect(Config.level).toBe(4);
  });
});

describe("createGetterObserverDecorator", () => {
  it("runs a cleanup returned by observe when the instance unmounts", () => {
    const stopped = vi.fn();
    const Observe = createGetterObserverDecorator({ observe: () => stopped });
    const Quiet = createGetterObserverDecorator({ observe: () => undefined });
    class Widget extends StatefulComponent {
      @Quiet @Observe get total() { return 1; }
      render() { return null; }
    }
    const widget = new Widget();
    widget.onMount?.();
    expect(stopped).not.toHaveBeenCalled();
    widget.onUnmount?.();
    expect(stopped).toHaveBeenCalledOnce();
  });

  it("registers on every mount with the getter, the instance and the name, after the fields are set", () => {
    const seen: unknown[] = [];
    const LogChange = createGetterObserverDecorator<Widget, number>({
      register(getter, instance, name) {
        return effect(() => { seen.push(`${name}=${String(getter.call(instance))}`); });
      },
    });
    class Widget extends StatefulComponent {
      @State() n = 1;
      @LogChange get double() { return this.n * 2; }
      render() { return null; }
    }
    const widget = new Widget();
    expect(seen).toEqual([]);
    widget.onMount?.();
    widget.n = 2;
    widget.onUnmount?.();
    widget.n = 3;
    expect(seen).toEqual(["double=2", "double=4"]);
  });

  it("needs observe or register, and names the decorator on another kind of member", () => {
    expect(() => createGetterObserverDecorator({ label: "@Log()" })).toThrow(
      "@Log(): createGetterObserverDecorator() needs observe() or register().",
    );
    const Observe = createGetterObserverDecorator({ label: "@Log()", observe: () => undefined });
    expect(() => {
      class A {
        // @ts-expect-error -- a getter decorator on a method
        @Observe run() { return 1; }
      }
      return A;
    }).toThrow('@Log() decorates getters only, not the method "run".');
  });
});

describe("createClassDecorator — shared hooks", () => {
  it("leaves the class as it is for a behavior with only initialize", () => {
    const initialize = vi.fn();
    const Register = createClassDecorator({ initialize });
    @Register
    class Page extends StatefulComponent {
      render() { return null; }
    }
    expect(Object.getPrototypeOf(Page)).toBe(StatefulComponent);
    expect(initialize).toHaveBeenCalledWith(Page, Page);
  });

  it("runs onMount/onUnmount of the behavior with the instance, between the class's and the enhancement's", () => {
    const log: string[] = [];
    class Tracked extends ClassBehavior<Widget> {
      onMount(instance: Widget) { log.push(`behavior:mount:${instance.id}`); }
      onUnmount(instance: Widget) { log.push(`behavior:unmount:${instance.id}`); }
      create(): ClassEnhancement {
        return { onMount: () => log.push("enhancement:mount"), onUnmount: () => log.push("enhancement:unmount") };
      }
    }
    @(createClassDecorator(new Tracked()))
    class Widget extends StatefulComponent {
      id = "w";
      onMount() { log.push("own:mount"); }
      onUnmount() { log.push("own:unmount"); }
      render() { return null; }
    }
    const widget = new Widget();
    widget.onMount();
    widget.onUnmount();
    expect(log).toEqual([
      "own:mount", "behavior:mount:w", "enhancement:mount",
      "own:unmount", "behavior:unmount:w", "enhancement:unmount",
    ]);
  });

  it("wraps render with the behavior's render around the enhancement's", () => {
    const Frame = createClassDecorator({
      render: (_instance: object, originalRender: () => Node | Node[] | null) => [originalRender() as unknown as Node, "frame" as unknown as Node],
      create: () => ({ render: (originalRender: () => Node | Node[] | null) => [originalRender() as unknown as Node, "inner" as unknown as Node] }),
    });
    const Plain = createClassDecorator({ onMount() { /* */ } });
    @Frame
    class Box extends StatefulComponent {
      render() { return "box" as unknown as Node; }
    }
    @Plain
    class Bare extends StatefulComponent {
      render() { return "bare" as unknown as Node; }
    }
    expect(new Box().render()).toEqual([["box", "inner"], "frame"]);
    expect(new Bare().render()).toBe("bare");
  });

  it("renders the original directly with a behavior render and no enhancement", () => {
    const Frame = createClassDecorator({
      render: (_instance: object, originalRender: () => Node | Node[] | null) => [originalRender() as unknown as Node],
    });
    @Frame
    class Box extends StatefulComponent {
      render() { return "box" as unknown as Node; }
    }
    expect(new Box().render()).toEqual(["box"]);
  });

  it("names the decorator when it is put on a member", () => {
    const Analytics = createClassDecorator({ label: "@Analytics()", onMount() { /* */ } });
    expect(() => {
      class Host extends StatefulComponent {
        // @ts-expect-error -- a class decorator on a method
        @Analytics run() { return 1; }
        render() { return null; }
      }
      return Host;
    }).toThrow('@Analytics() decorates classes only, not the method "run".');
  });
});
