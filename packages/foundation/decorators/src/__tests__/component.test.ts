import { describe, it, expect } from "vitest";

import { StatefulComponent, StatelessComponent } from "@praxisjs/core";

import { Component } from "../component/component";

// ── Component decorator ───────────────────────────────────────────────────────

describe("Component decorator", () => {
  it("sets __isComponent = true on the enhanced class", () => {
    class MyComp extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(MyComp, {} as ClassDecoratorContext);
    expect(Enhanced.__isComponent).toBe(true);
  });

  it("preserves the original class name", () => {
    class MyButton extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(MyButton, {} as ClassDecoratorContext);
    expect(Enhanced.name).toBe("MyButton");
  });

  it("marks __isStateless = false for StatefulComponent subclasses", () => {
    class MyStateful extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(MyStateful, {} as ClassDecoratorContext);
    expect(Enhanced.__isStateless).toBe(false);
  });

  it("marks __isStateless = true for StatelessComponent subclasses", () => {
    class MyStateless extends StatelessComponent {
      render() { return null; }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Enhanced = Component()(MyStateless as any, {} as ClassDecoratorContext);
    expect(Enhanced.__isStateless).toBe(true);
  });

  it("enhanced class can still be instantiated", () => {
    class Counter extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(Counter, {} as ClassDecoratorContext);
    const instance = new Enhanced();
    expect(instance).toBeInstanceOf(Counter);
  });

  it("returns a subclass of the original constructor", () => {
    class Base extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(Base, {} as ClassDecoratorContext);
    expect(Enhanced.prototype).toBeInstanceOf(Base);
  });

  // ── Happy paths ──────────────────────────────────────────────────────────────

  it("forwards constructor args — props reach the base constructor", () => {
    class WithProps extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(WithProps, {} as ClassDecoratorContext);
    const instance = new Enhanced({ greeting: "hello" });
    expect(instance.props.greeting).toBe("hello");
  });

  it("instance methods from the original class remain accessible", () => {
    class Greeter extends StatefulComponent {
      greet() { return "hello"; }
      render() { return null; }
    }
    const Enhanced = Component()(Greeter, {} as ClassDecoratorContext);
    const instance = new Enhanced();
    expect((instance as Greeter).greet()).toBe("hello");
  });

  it("static properties of the original class are preserved on Enhanced", () => {
    class WithStatic extends StatefulComponent {
      static readonly version = "1.0";
      render() { return null; }
    }
    const Enhanced = Component()(WithStatic, {} as ClassDecoratorContext);
    expect((Enhanced as typeof WithStatic).version).toBe("1.0");
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it("applying Component() twice preserves name and flags", () => {
    class MyComp extends StatefulComponent {
      render() { return null; }
    }
    const E1 = Component()(MyComp, {} as ClassDecoratorContext);
    const E2 = Component()(E1, {} as ClassDecoratorContext);
    expect(E2.__isComponent).toBe(true);
    expect(E2.__isStateless).toBe(false);
    expect(E2.name).toBe("MyComp"); // name survives double-wrap
  });

  it("deep StatelessComponent inheritance — __isStateless is still true", () => {
    class BaseStateless extends StatelessComponent {
      render() { return null; }
    }
    class DeepChild extends BaseStateless {
      render() { return null; }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Enhanced = Component()(DeepChild as any, {} as ClassDecoratorContext);
    expect(Enhanced.__isStateless).toBe(true);
  });

  it("anonymous class gets an empty name", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Enhanced = Component()(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      class extends StatefulComponent { render() { return null; } } as any,
      {} as ClassDecoratorContext,
    );
    expect(Enhanced.name).toBe("");
  });

  it("__isComponent and __isStateless are static — not own properties of instances", () => {
    class MyComp extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(MyComp, {} as ClassDecoratorContext);
    const instance = new Enhanced();
    // Static fields live on the class, not on instances
    expect(Object.prototype.hasOwnProperty.call(instance, "__isComponent")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(instance, "__isStateless")).toBe(false);
  });

  it("subclassing Enhanced inherits __isComponent and __isStateless", () => {
    class MyComp extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(MyComp, {} as ClassDecoratorContext);
    // `class Sub extends Enhanced` sets Object.getPrototypeOf(Sub) === Enhanced,
    // making static fields visible through the chain. Simulate that here to
    // avoid TS2510 (conflicting constructor return types in the intersection type).
    const Sub = Object.create(Enhanced) as typeof Enhanced;
    expect(Sub.__isComponent).toBe(true);
    expect(Sub.__isStateless).toBe(false);
  });

  it("Enhanced is a different reference from the original constructor", () => {
    class MyComp extends StatefulComponent {
      render() { return null; }
    }
    const Enhanced = Component()(MyComp, {} as ClassDecoratorContext);
    expect(Enhanced).not.toBe(MyComp);
  });
});
