// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";

import { setReactiveObserver, signal, type EffectNode } from "@praxisjs/core/internal";

import { mountComponent } from "../component";
import { getCurrentScope, runInScope } from "../context";
import { mountElement } from "../element";
import { For } from "../list";
import { mountReactive } from "../reactive";
import { Scope } from "../scope";

interface Region {
  parent: Node;
  fn: () => unknown;
  parentScope: Scope;
  scope: Scope | null;
}

function keeperOf<T>(ctor: unknown): T {
  const descriptor = Object.getOwnPropertyDescriptor(ctor, "shapeKeeper");
  expect(descriptor).toMatchObject({ enumerable: false, writable: false, configurable: false });
  return (descriptor as PropertyDescriptor).value as T;
}

// Same own keys in the same order from the same constructor means the same chain of transitions.
function expectSameShape(keeper: object, real: object): void {
  expect(Object.getPrototypeOf(keeper)).toBe(Object.getPrototypeOf(real));
  expect(Object.keys(keeper)).toEqual(Object.keys(real));
}

// Regions are reached through the effects that run them (the ctx of a reactive child's effect).
function collectRegions(): Region[] {
  const regions: Region[] = [];
  setReactiveObserver({
    effect(node: EffectNode) {
      const ctx = node.ctx as Region | undefined;
      if (ctx !== undefined && "parentScope" in ctx && !regions.includes(ctx)) regions.push(ctx);
    },
  });
  return regions;
}

afterEach(() => {
  setReactiveObserver(null);
  document.body.innerHTML = "";
});

describe("scope keeper", () => {
  it("is an empty scope with the shape real scopes reach", () => {
    const keeper = keeperOf<Scope>(Scope);
    expect(keeper).toBeInstanceOf(Scope);
    expectSameShape(keeper, new Scope().fork());
    expect(keeper.gen).toBe(0);
  });
});

describe("region keeper", () => {
  it("has the shape real regions reach and is never run", () => {
    const regions = collectRegions();
    const value = signal("a");
    const parent = document.createElement("p");
    mountReactive(parent, () => value(), new Scope());
    value.set("b");
    const region = regions[0];
    const keeper = keeperOf<Region>(region.constructor);
    expectSameShape(keeper, region);
    expect(keeper.parent).toBeNull();
    expect(keeper.parentScope).toBeNull();
    expect(keeper.scope).toBeNull();
    expect(keeper.fn()).toBeUndefined();
    expect(parent.textContent).toBe("b");
  });
});

describe("row keeper", () => {
  it("has the shape every kind of row reaches", () => {
    const regions = collectRegions();
    const rows: Scope[] = [];
    const list = signal([1, 2, 3]);
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const scope = new Scope();
    const props = {
      each: list,
      fallback: () => "empty",
      children: (item: () => number) => {
        rows.push(getCurrentScope());
        if (item() === 1) return mountElement("span", { children: "one" }, getCurrentScope());
        if (item() === 2) return [document.createElement("b"), document.createElement("i")];
        return null;
      },
    };
    runInScope(scope, () => {
      for (const node of mountComponent(For as never, props, scope)) parent.appendChild(node);
    });
    list.set([]);
    const fallbackRow = (regions.find((r) => r.parentScope !== scope) as Region).parentScope;

    const keeper = keeperOf<Scope & { first: Node | null; last: Node | null; key: unknown; item: unknown; index: number }>(
      rows[0].constructor,
    );
    for (const row of [...rows, fallbackRow]) expectSameShape(keeper, row);
    expect(keeper.first).toBeNull();
    expect(keeper.last).toBeNull();
    expect(keeper.key).toBeNull();
    expect(keeper.item).toBeUndefined();
    expect(keeper.index).toBe(0);
    expect(parent.textContent).toBe("empty");
    scope.dispose();
  });
});
