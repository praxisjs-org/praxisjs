import { describe, it, expect } from "vitest";

import * as internal from "../internal";

describe("@praxisjs/core/internal", () => {
  it("exposes the reactive graph primitives other framework packages build on", () => {
    for (const name of [
      "createEffect", "createContextEffect", "disposeEffect", "startBatch", "endBatch", "EffectNode", "SignalNode", "readSignal",
      "writeSignal", "ComputedNode", "readComputed", "pauseTracking", "resumeTracking",
      "getComponentStart", "setComponentStart",
    ]) {
      expect(internal).toHaveProperty(name);
    }
  });

  it("reads and writes a bare signal node", () => {
    const node = new internal.SignalNode(1);
    const seen: number[] = [];
    const effect = internal.createEffect(() => { seen.push(internal.readSignal(node)); });
    internal.writeSignal(node, 2);
    internal.disposeEffect(effect);
    internal.writeSignal(node, 3);
    expect(seen).toEqual([1, 2]);
  });

  it("runs a context effect with the node as `this`, sharing one function between effects", () => {
    const node = new internal.SignalNode(1);
    const seen: Array<[string, number]> = [];
    function run(this: internal.EffectNode<{ name: string }>) {
      seen.push([this.ctx.name, internal.readSignal(node)]);
    }
    const a = internal.createContextEffect(run, { name: "a" });
    internal.createContextEffect(run, { name: "b" });
    internal.writeSignal(node, 2);
    internal.disposeEffect(a);
    internal.writeSignal(node, 3);
    expect(seen).toEqual([["a", 1], ["b", 1], ["a", 2], ["b", 2], ["b", 3]]);
  });
});
