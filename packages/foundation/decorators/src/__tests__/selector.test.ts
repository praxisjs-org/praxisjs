import { describe, it, expect } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { computed, effect } from "@praxisjs/core/internal";

import { Selector } from "../properties/selector";
import { State } from "../properties/state";

function fieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) {
        initializers.push(fn);
      },
    } as unknown as ClassFieldDecoratorContext<Record<string, unknown>, Selector<never>>,
    run(instance: unknown) {
      initializers.forEach((fn) => { fn.call(instance); });
    },
  };
}

class TestComponent extends StatefulComponent {
  render() { return null; }
}

type Host = TestComponent & Record<string, unknown>;

function withState(name: string, value: unknown): Host {
  const instance = new TestComponent() as Host;
  instance[name] = value;
  const { ctx, run } = fieldCtx(name);
  State()(undefined, ctx as unknown as ClassFieldDecoratorContext);
  run(instance);
  return instance;
}

function trackKeys(isSelected: Selector<number>, count: number) {
  const runs = new Array<number>(count).fill(0);
  const results = new Array<boolean>(count).fill(false);
  for (let key = 0; key < count; key++) {
    effect(() => {
      runs[key]++;
      results[key] = isSelected(key);
    });
  }
  return { runs, results };
}

describe("Selector decorator", () => {
  it("exposes a selector over the named field", () => {
    const instance = withState("selected", 1);
    const { ctx, run } = fieldCtx("isSelected");
    Selector("selected")(undefined, ctx);
    run(instance);

    const isSelected = instance.isSelected as Selector<number>;
    expect(isSelected(1)).toBe(true);
    expect(instance.isSelected).toBe(isSelected);

    const { runs, results } = trackKeys(isSelected, 4);
    instance.selected = 3;
    expect(results).toEqual([false, false, false, true]);
    expect(runs).toEqual([1, 2, 1, 2]);
  });

  it("accepts a custom equality", () => {
    const instance = withState("selectedIds", [0]);
    const { ctx, run } = fieldCtx("isSelected");
    Selector("selectedIds", {
      equals: (key: number, ids: number[]) => ids.includes(key),
    })(undefined, ctx);
    run(instance);

    const { runs, results } = trackKeys(instance.isSelected as Selector<number>, 4);
    instance.selectedIds = [0, 2, 3];
    expect(results).toEqual([true, false, true, true]);
    expect(runs).toEqual([1, 1, 2, 2]);
  });

  it("reads a field that holds a computed", async () => {
    const state = withState("selected", 1);
    const instance = new TestComponent() as Host;
    instance.current = computed(() => state.selected);
    const { ctx, run } = fieldCtx("isCurrent");
    Selector("current")(undefined, ctx);
    run(instance);

    const { results } = trackKeys(instance.isCurrent as Selector<number>, 3);
    state.selected = 2;
    await Promise.resolve();
    expect(results).toEqual([false, false, true]);
  });

  it("gives each instance its own selector", () => {
    const first = withState("selected", 1);
    const second = withState("selected", 2);
    const { ctx, run } = fieldCtx("isSelected");
    Selector("selected")(undefined, ctx);
    run(first);
    run(second);

    expect((first.isSelected as Selector<number>)(1)).toBe(true);
    expect((second.isSelected as Selector<number>)(1)).toBe(false);
  });
});
