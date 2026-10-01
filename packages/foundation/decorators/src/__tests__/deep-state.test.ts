import { describe, it, expect } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { effect } from "@praxisjs/core/internal";

import { DeepState } from "../properties/deep-state";

class TestComponent extends StatefulComponent {
  render() { return null; }
}

function fieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) { initializers.push(fn); },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

describe("@DeepState decorator", () => {
  it("reads initial value", () => {
    const { ctx, run } = fieldCtx("config");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).config = { theme: "light" };
    run(instance);

    const inst = instance as unknown as { config: { theme: string } };
    expect(inst.config.theme).toBe("light");
  });

  it("nested object mutation triggers reactive effect", () => {
    const { ctx, run } = fieldCtx("config");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).config = { theme: { mode: "light" } };
    run(instance);

    const inst = instance as unknown as { config: { theme: { mode: string } } };
    const log: string[] = [];
    effect(() => { log.push(inst.config.theme.mode); });

    inst.config.theme.mode = "dark";
    expect(log).toEqual(["light", "dark"]);
  });

  it("array push triggers reactive effect", () => {
    const { ctx, run } = fieldCtx("items");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).items = [1, 2];
    run(instance);

    const inst = instance as unknown as { items: number[] };
    const log: number[][] = [];
    effect(() => { log.push([...inst.items]); });

    inst.items.push(3);
    expect(log[log.length - 1]).toEqual([1, 2, 3]);
  });

  it("array index assignment triggers reactive effect", () => {
    const { ctx, run } = fieldCtx("list");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).list = ["a", "b"];
    run(instance);

    const inst = instance as unknown as { list: string[] };
    const log: string[][] = [];
    effect(() => { log.push([...inst.list]); });

    inst.list[0] = "z";
    expect(log[log.length - 1]).toEqual(["z", "b"]);
  });

  it("property deletion triggers reactive effect", () => {
    const { ctx, run } = fieldCtx("obj");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).obj = { a: 1, b: 2 };
    run(instance);

    const inst = instance as unknown as { obj: Record<string, number> };
    const log: string[][] = [];
    effect(() => { log.push(Object.keys(inst.obj)); });

    delete inst.obj.a;
    expect(log[log.length - 1]).not.toContain("a");
  });

  it("direct assignment replaces root and triggers effect", () => {
    const { ctx, run } = fieldCtx("data");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).data = { x: 1 };
    run(instance);

    const inst = instance as unknown as { data: { x: number } };
    const log: number[] = [];
    effect(() => { log.push(inst.data.x); });

    inst.data = { x: 99 };
    expect(log).toEqual([1, 99]);
  });

  it("mutations on new root after reassignment are reactive", () => {
    const { ctx, run } = fieldCtx("cfg");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).cfg = { v: 0 };
    run(instance);

    const inst = instance as unknown as { cfg: { v: number } };
    inst.cfg = { v: 10 };

    const log: number[] = [];
    effect(() => { log.push(inst.cfg.v); });

    inst.cfg.v = 20;
    expect(log).toEqual([10, 20]);
  });

  it("null initial value is handled gracefully", () => {
    const { ctx, run } = fieldCtx("maybe");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).maybe = null;
    run(instance);

    const inst = instance as unknown as { maybe: null | { x: number } };
    expect(inst.maybe).toBeNull();

    const log: unknown[] = [];
    effect(() => { log.push(inst.maybe); });

    inst.maybe = { x: 5 };
    expect(log).toEqual([null, { x: 5 }]);
  });

  it("setter with null value — proxy not created, value is null", () => {
    const { ctx, run } = fieldCtx("nullable");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).nullable = { x: 1 };
    run(instance);

    const inst = instance as unknown as { nullable: { x: number } | null };
    inst.nullable = null;
    expect(inst.nullable).toBeNull();
  });

  it("setter with primitive value — value stored directly without proxy", () => {
    const { ctx, run } = fieldCtx("num");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).num = { v: 0 };
    run(instance);

    const inst = instance as unknown as { num: number | { v: number } };
    inst.num = 99;
    expect(inst.num).toBe(99);
  });

  it("deeply nested mutation triggers effect", () => {
    const { ctx, run } = fieldCtx("deep");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).deep = { a: { b: { c: 0 } } };
    run(instance);

    const inst = instance as unknown as { deep: { a: { b: { c: number } } } };
    const log: number[] = [];
    effect(() => { log.push(inst.deep.a.b.c); });

    inst.deep.a.b.c = 42;
    expect(log).toEqual([0, 42]);
  });
});

describe("@DeepState — proxy identity and notifications", () => {
  function setup(initial: unknown) {
    const { ctx, run } = fieldCtx("data");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).data = initial;
    run(instance);
    const inst = instance as unknown as { data: any };
    let runs = 0;
    effect(() => {
      void inst.data;
      runs++;
    });
    runs = 0;
    return { inst, runs: () => runs };
  }

  it("returns the same proxy for the same nested object", () => {
    const { inst } = setup({ nested: { a: 1 } });
    expect(inst.data.nested).toBe(inst.data.nested);
  });

  it("keeps identity across reads after an unrelated mutation", () => {
    const { inst } = setup({ nested: { a: 1 }, other: 0 });
    const before = inst.data.nested;
    inst.data.other = 1;
    expect(inst.data.nested).toBe(before);
  });

  it("returns a fresh proxy once the root is replaced", () => {
    const { inst } = setup({ nested: { a: 1 } });
    const before = inst.data;
    inst.data = { nested: { a: 1 } };
    expect(inst.data).not.toBe(before);
  });

  it("does not notify when a property is set to the value it already has", () => {
    const { inst, runs } = setup({ a: 1 });
    inst.data.a = 1;
    expect(runs()).toBe(0);
  });

  it("notifies when a property changes or a new key is added", () => {
    const { inst, runs } = setup({ a: 1 });
    inst.data.a = 2;
    expect(runs()).toBe(1);
    inst.data.b = 3;
    expect(runs()).toBe(2);
  });

  it("notifies once for an array push", () => {
    const { inst, runs } = setup({ list: [1] });
    inst.data.list.push(2);
    expect(runs()).toBe(1);
    expect(inst.data.list.length).toBe(2);
  });

  it("notifies on delete only when the key existed", () => {
    const { inst, runs } = setup({ a: 1 });
    delete inst.data.missing;
    expect(runs()).toBe(0);
    delete inst.data.a;
    expect(runs()).toBe(1);
  });

  it("assigning a primitive root and null roots still works", () => {
    const { ctx, run } = fieldCtx("n");
    DeepState()(undefined, ctx);
    const instance = new TestComponent();
    (instance as unknown as Record<string, unknown>).n = null;
    run(instance);
    const inst = instance as unknown as { n: unknown };
    expect(inst.n).toBeNull();
    inst.n = 5;
    expect(inst.n).toBe(5);
    inst.n = { x: 1 };
    expect((inst.n as { x: number }).x).toBe(1);
  });
});
