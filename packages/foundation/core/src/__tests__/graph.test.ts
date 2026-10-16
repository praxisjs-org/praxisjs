import { describe, it, expect, vi } from "vitest";

import { batch } from "../signal/batch";
import { computed } from "../signal/computed";
import { effect } from "../signal/effect";
import {
  createEffect,
  getEffectOwner,
  isBatching,
  pauseTracking,
  resumeTracking,
  setCurrentOwner,
  setReactiveObserver,
  type EffectNode,
  notify as notifyNode,
  SignalNode as GraphSignalNode,
  writeSignal as writeNode,
} from "../signal/graph";
import { signal } from "../signal/signal";

describe("reactive graph", () => {
  it("pauseTracking stops subscriptions until resumeTracking", () => {
    const s = signal(1);
    const run = vi.fn();
    effect(() => {
      const prev = pauseTracking();
      s();
      resumeTracking(prev);
      run();
    });
    s.set(2);
    expect(run).toHaveBeenCalledOnce();
  });

  it("reports whether a batch is open", () => {
    expect(isBatching()).toBe(false);
    let inside = false;
    batch(() => { inside = isBatching(); });
    expect(inside).toBe(true);
  });

  it("links a source read several times in one run once", () => {
    const a = signal(1);
    const b = signal(2);
    const run = vi.fn();
    effect(() => {
      run(a() + b() + a() + b() + a());
    });
    run.mockClear();
    a.set(10);
    expect(run).toHaveBeenCalledOnce();
    expect(run).toHaveBeenLastCalledWith(34);
  });

  it("drops every link when a re-run reads nothing", () => {
    let reads = true;
    const s = signal(0);
    const run = vi.fn();
    effect(() => {
      run();
      if (reads) s();
    });
    reads = false;
    s.set(1);
    run.mockClear();
    s.set(2);
    expect(run).not.toHaveBeenCalled();
  });

  it("keeps one link per source when a re-run reads them in a new order", () => {
    const swap = signal(false);
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    const run = vi.fn();
    effect(() => {
      run(swap() ? c() + b() : a() + b());
    });
    swap.set(true);
    run.mockClear();
    b.set(20);
    expect(run).toHaveBeenCalledOnce();
    a.set(10);
    expect(run).toHaveBeenCalledOnce();
    c.set(30);
    expect(run).toHaveBeenLastCalledWith(50);
  });

  it("does not re-run an effect for a write to a source it has not read again yet in this run", () => {
    const s = signal(0);
    const run = vi.fn();
    effect(() => {
      run();
      if (s() === 0) return;
      s.set(s());
    });
    const other = signal(0);
    effect(() => {
      // Writes `s` before reading it: the link from the previous run must not count.
      other();
      s.set(1);
      s();
    });
    expect(s()).toBe(1);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("ignores a write made before a re-run has read anything", () => {
    const s = signal(0);
    let runs = 0;
    effect(() => {
      if (runs++ > 0) s.set(100);
      s();
    });
    s.set(1);
    expect(runs).toBe(2);
    expect(s()).toBe(100);
  });

  it("defers the re-run of a self-invalidating effect created inside a batch to the end of the batch", () => {
    const count = signal(0);
    const seen: number[] = [];
    batch(() => {
      effect(() => {
        const value = count();
        seen.push(value);
        if (value < 2) count.set(value + 1);
      });
      expect(seen).toEqual([0]);
    });
    expect(seen).toEqual([0, 1, 2]);
  });

  it("re-runs an effect that changed a source it already read in the same run", () => {
    const count = signal(0);
    const seen: number[] = [];
    effect(() => {
      const value = count();
      seen.push(value);
      if (value < 3) count.set(value + 1);
    });
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it("skips a subscriber whose computed source recomputed to the same value", async () => {
    const s = signal(2);
    const unrelated = signal("x");
    const parity = computed(() => s() % 2);
    const run = vi.fn();
    effect(() => { run(unrelated() + String(parity())); });
    run.mockClear();
    s.set(4);
    await Promise.resolve();
    expect(run).not.toHaveBeenCalled();
    s.set(5);
    await Promise.resolve();
    expect(run).toHaveBeenCalledWith("x1");
  });

  it("throws on a computed that reads itself", () => {
    const self: { c?: () => number } = {};
    self.c = computed((): number => (self.c as () => number)() + 1);
    expect(() => (self.c as () => number)()).toThrow(/Cycle detected/);
  });

  it("orders a diamond so the joining effect sees one consistent update", async () => {
    const s = signal(1);
    const left = computed(() => s() + 1);
    const right = computed(() => s() * 2);
    const seen: string[] = [];
    effect(() => { seen.push(`${String(left())}/${String(right())}`); });
    s.set(2);
    s.set(3);
    await Promise.resolve();
    expect(seen).toEqual(["2/2", "4/6"]);
  });

  it("runs an effect that reads a signal directly in the same tick, with up-to-date computeds", () => {
    const s = signal(1);
    const doubled = computed(() => s() * 2);
    const seen: string[] = [];
    effect(() => { seen.push(`${String(s())}/${String(doubled())}`); });
    s.set(2);
    expect(seen).toEqual(["1/2", "2/4"]);
  });

  it("moves a deferred effect to the synchronous pass when a signal it reads changes too", async () => {
    const s = signal(1);
    const other = signal("a");
    const doubled = computed(() => s() * 2);
    const seen: string[] = [];
    effect(() => { seen.push(`${other()}${String(doubled())}`); });
    s.set(2);
    other.set("b");
    expect(seen).toEqual(["a2", "b4"]);
    await Promise.resolve();
    expect(seen).toEqual(["a2", "b4"]);
  });

  it("defers an effect whose computed went stale while it was running", async () => {
    const s = signal(1);
    const doubled = computed(() => s() * 2);
    const seen: number[] = [];
    effect(() => {
      const value = doubled();
      seen.push(value);
      if (value === 2) s.set(2);
    });
    expect(seen).toEqual([2]);
    await Promise.resolve();
    expect(seen).toEqual([2, 4]);
  });

  it("retries a computed that threw, and reaches its subscribers once a later change succeeds", async () => {
    const s = signal(0);
    const c = computed(() => {
      if (s() === 1) throw new Error("bad");
      return s();
    });
    const seen: unknown[] = [];
    effect(() => {
      try {
        seen.push(c());
      } catch (e) {
        seen.push((e as Error).message);
      }
    });
    s.set(1);
    await Promise.resolve();
    s.set(2);
    await Promise.resolve();
    expect(seen).toEqual([0, "bad", 2]);
  });

  it("forgets what an effect read after it was disposed during its own run", () => {
    const s = signal(0);
    const after = signal(0);
    const run = vi.fn();
    const stop = effect(() => {
      run();
      if (s() === 1) {
        stop();
        after();
      }
    });
    s.set(1);
    run.mockClear();
    after.set(1);
    s.set(2);
    expect(run).not.toHaveBeenCalled();
  });

  it("defers every effect behind one computed to a single microtask", async () => {
    const s = signal(1);
    const doubled = computed(() => s() * 2);
    const a: number[] = [];
    const b: number[] = [];
    effect(() => { a.push(doubled()); });
    effect(() => { b.push(doubled()); });
    s.set(2);
    s.set(3);
    await Promise.resolve();
    expect(a).toEqual([2, 6]);
    expect(b).toEqual([2, 6]);
  });

  it("keeps an effect in the deferred pass when it re-ran synchronously and went stale again", async () => {
    const s = signal(1);
    const other = signal("a");
    const doubled = computed(() => s() * 2);
    const seen: string[] = [];
    effect(() => {
      const o = other();
      const d = doubled();
      seen.push(`${o}${String(d)}`);
      if (o === "b" && d === 4) s.set(3);
    });
    s.set(2);
    other.set("b");
    expect(seen).toEqual(["a2", "b4"]);
    await Promise.resolve();
    expect(seen).toEqual(["a2", "b4", "b6"]);
  });
});

describe("effect owners", () => {
  it("records what was rendering when an effect is created, with or without an observer", () => {
    const owner = {};
    const prev = setCurrentOwner(owner);
    const owned = createEffect(() => undefined);
    setCurrentOwner(prev);
    const loose = createEffect(() => undefined);
    expect(getEffectOwner(owned)).toBe(owner);
    expect(getEffectOwner(loose)).toBeUndefined();
  });

  it("gives effects created during a run the owner of the effect that runs", () => {
    const owner = {};
    const show = signal(0);
    const created: EffectNode[] = [];
    const prev = setCurrentOwner(owner);
    createEffect(() => {
      show();
      created.push(createEffect(() => undefined));
    });
    setCurrentOwner(prev);
    show.set(1);
    expect(created.map((node) => getEffectOwner(node))).toEqual([owner, owner]);
    const outer = {};
    setCurrentOwner(outer);
    const inner = createEffect(() => { created.push(createEffect(() => undefined)); });
    setCurrentOwner(undefined);
    expect(getEffectOwner(inner)).toBe(outer);
    expect(getEffectOwner(created[2])).toBe(outer);
    expect(setCurrentOwner(undefined)).toBeUndefined();
  });

  it("passes the owner to the observer for every effect run", () => {
    const owner = {};
    const seen: unknown[] = [];
    const prevObserver = setReactiveObserver({ effect: (_node, _ms, o) => { seen.push(o); } });
    const prev = setCurrentOwner(owner);
    createEffect(() => undefined);
    setCurrentOwner(prev);
    createEffect(() => undefined);
    setReactiveObserver(prevObserver);
    expect(seen).toEqual([owner, undefined]);
  });
});

describe("reactive observer", () => {
  it("reports writes and computed runs, and tolerates an observer without hooks", () => {
    const writes: unknown[] = [];
    const computes: number[] = [];
    const s = signal(1);
    const double = computed(() => s() * 2);
    const prev = setReactiveObserver({ write: (node) => { writes.push(node); }, compute: (_node, ms) => { computes.push(ms); } });
    expect(double()).toBe(2);
    s.set(2);
    expect(double()).toBe(4);
    expect(() => computed(() => { throw new Error("x"); })()).toThrow("x");
    setReactiveObserver({});
    s.set(3);
    expect(double()).toBe(6);
    createEffect(() => undefined);
    setReactiveObserver(prev);
    expect(writes).toHaveLength(1);
    expect(computes).toHaveLength(3);
  });
});

describe("writeSignal() and notify()", () => {
  it("skip the notification pass for a node nothing reads, and treat NaN and signed zeros like Object.is", () => {
    const node = new GraphSignalNode<number>(Number.NaN);
    expect(() => { notifyNode(node); }).not.toThrow();
    writeNode(node, Number.NaN);
    expect(node.version).toBe(0);
    writeNode(node, 0);
    expect(node.version).toBe(1);
    writeNode(node, -0);
    expect(node.version).toBe(2);
    writeNode(node, -0);
    expect(node.version).toBe(2);
  });
});
