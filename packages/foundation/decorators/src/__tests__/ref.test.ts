// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { Ref, createRef } from "../properties/ref";

function fieldCtx(name: string) {
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
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

class TestComponent extends StatefulComponent {
  render() { return null; }
}

describe("Ref decorator", () => {
  it("initializes .current to null", () => {
    const { ctx, run } = fieldCtx("elRef");
    Ref()(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const ref = (instance as unknown as Record<string, unknown>).elRef as { current: unknown };
    expect(ref.current).toBeNull();
  });

  it("is callable and sets .current", () => {
    const { ctx, run } = fieldCtx("elRef");
    Ref<HTMLDivElement>()(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const ref = (instance as unknown as Record<string, unknown>).elRef as ((el: HTMLDivElement | null) => void) & { current: HTMLDivElement | null };
    const fakeEl = document.createElement("div") as HTMLDivElement;
    ref(fakeEl);

    expect(ref.current).toBe(fakeEl);
  });

  it("calling with null clears .current", () => {
    const { ctx, run } = fieldCtx("elRef");
    Ref<HTMLDivElement>()(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const ref = (instance as unknown as Record<string, unknown>).elRef as ((el: HTMLDivElement | null) => void) & { current: HTMLDivElement | null };
    const fakeEl = document.createElement("div") as HTMLDivElement;
    ref(fakeEl);
    expect(ref.current).toBe(fakeEl);

    ref(null);
    expect(ref.current).toBeNull();
  });

  it("returns the same ref object on every access", () => {
    const { ctx, run } = fieldCtx("elRef");
    Ref()(undefined, ctx);

    const instance = new TestComponent();
    run(instance);

    const inst = instance as unknown as Record<string, unknown>;
    expect(inst.elRef).toBe(inst.elRef);
  });

  it("each instance gets its own independent ref", () => {
    const { ctx: ctx1, run: run1 } = fieldCtx("elRef");
    const { ctx: ctx2, run: run2 } = fieldCtx("elRef");
    Ref<HTMLDivElement>()(undefined, ctx1);
    Ref<HTMLDivElement>()(undefined, ctx2);

    const a = new TestComponent();
    const b = new TestComponent();
    run1(a);
    run2(b);

    const refA = (a as unknown as Record<string, unknown>).elRef as ((el: HTMLDivElement | null) => void) & { current: HTMLDivElement | null };
    const refB = (b as unknown as Record<string, unknown>).elRef as ((el: HTMLDivElement | null) => void) & { current: HTMLDivElement | null };

    const el = document.createElement("div") as HTMLDivElement;
    refA(el);

    expect(refA.current).toBe(el);
    expect(refB.current).toBeNull();
  });
});

describe("createRef", () => {
  it("initializes .current to null", () => {
    const ref = createRef<HTMLDivElement>();
    expect(ref.current).toBeNull();
  });

  it("is callable and sets .current", () => {
    const ref = createRef<HTMLDivElement>();
    const el = document.createElement("div") as HTMLDivElement;
    ref(el);
    expect(ref.current).toBe(el);
  });

  it("calling with null clears .current", () => {
    const ref = createRef<HTMLDivElement>();
    const el = document.createElement("div") as HTMLDivElement;
    ref(el);
    ref(null);
    expect(ref.current).toBeNull();
  });

  it("each call creates an independent ref", () => {
    const a = createRef<HTMLDivElement>();
    const b = createRef<HTMLDivElement>();
    const el = document.createElement("div") as HTMLDivElement;
    a(el);
    expect(a.current).toBe(el);
    expect(b.current).toBeNull();
  });
});
