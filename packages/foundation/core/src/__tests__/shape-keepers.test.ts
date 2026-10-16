import { describe, it, expect } from "vitest";

import { computed } from "../signal/computed";
import {
  COMPUTED,
  ComputedNode,
  createEffect,
  DIRTY,
  disposeEffect,
  EFFECT,
  EffectNode,
  Link,
  readSignal,
  type ReactiveNode,
  SignalNode,
  writeSignal,
} from "../signal/graph";
import { selector } from "../signal/selector";

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

function expectUnlinked(node: ReactiveNode): void {
  expect(node.subs).toBeUndefined();
  expect(node.subsTail).toBeUndefined();
  expect(node.deps).toBeUndefined();
  expect(node.depsTail).toBeUndefined();
}

describe("shape keepers", () => {
  const signalKeeper = keeperOf<SignalNode>(SignalNode);
  const computedKeeper = keeperOf<ComputedNode>(ComputedNode);
  const effectKeeper = keeperOf<EffectNode>(EffectNode);
  const linkKeeper = keeperOf<Link>(Link);

  it("keeps one inert instance of each graph class", () => {
    expect(signalKeeper).toBeInstanceOf(SignalNode);
    expect(signalKeeper.flags).toBe(0);
    expect(signalKeeper.value).toBeUndefined();
    expect(computedKeeper.flags).toBe(COMPUTED | DIRTY);
    expect(effectKeeper.flags).toBe(EFFECT);
    expect(effectKeeper.owner).toBeUndefined();
    expect(effectKeeper.ctx).toBeUndefined();
    for (const node of [signalKeeper, computedKeeper, effectKeeper]) expectUnlinked(node);
    expect(linkKeeper.dep).toBe(signalKeeper);
    expect(linkKeeper.sub).toBe(effectKeeper);
    expect(linkKeeper.nextDep).toBeUndefined();
    expect(linkKeeper.prevSub).toBeUndefined();
    expect(linkKeeper.nextSub).toBeUndefined();
  });

  it("gives keepers functions that do nothing", () => {
    expect(effectKeeper.fn()).toBeUndefined();
    expect(computedKeeper.getter()).toBeUndefined();
    expectUnlinked(effectKeeper);
  });

  it("has the shape real nodes and links reach", () => {
    const source = new SignalNode(1);
    const double = computed(() => readSignal(source) * 2);
    const effect = createEffect(() => {
      double();
    });
    const computedLink = effect.deps as Link;
    const computedNode = computedLink.dep as ComputedNode;
    expectSameShape(signalKeeper, source);
    expectSameShape(computedKeeper, computedNode);
    expectSameShape(effectKeeper, effect);
    expectSameShape(linkKeeper, computedLink);
    disposeEffect(effect);
  });

  it("stays out of graphs that are built, updated and disposed", () => {
    const source = new SignalNode(1);
    const seen: number[] = [];
    const effect = createEffect(() => {
      seen.push(readSignal(source));
    });
    writeSignal(source, 2);
    disposeEffect(effect);
    writeSignal(source, 3);
    expect(seen).toEqual([1, 2]);
    expectUnlinked(signalKeeper);
    expectUnlinked(effectKeeper);
    expect(signalKeeper.version).toBe(0);
    expect(effectKeeper.flags).toBe(EFFECT);
  });
});

describe("selector bucket keeper", () => {
  it("is an unlinked bucket with the shape real buckets reach", () => {
    const selected = new SignalNode(1);
    const isSelected = selector(() => readSignal(selected));
    const effect = createEffect(() => {
      isSelected(1);
    });
    const bucket = (effect.deps as Link).dep;
    const keeper = keeperOf<ReactiveNode & { key: unknown; unwatched(): void }>(bucket.constructor);
    expectSameShape(keeper, bucket);
    expectUnlinked(keeper);
    expect(keeper.key).toBeUndefined();

    keeper.unwatched();
    writeSignal(selected, 2);
    expect(bucket.version).toBe(1);
    expectUnlinked(keeper);
    disposeEffect(effect);
  });
});
