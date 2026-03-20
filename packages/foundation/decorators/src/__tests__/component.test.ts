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
    const Enhanced = Component()(MyStateless as never, {} as ClassDecoratorContext);
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
});
