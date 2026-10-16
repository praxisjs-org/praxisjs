import { describe, it, expect, vi, afterEach } from "vitest";

import { computed, createEffect, setCurrentOwner, signal } from "@praxisjs/core/internal";

import { Profiler } from "../core/profiler";

afterEach(() => { vi.useRealTimers(); });

class Widget {}

describe("Profiler", () => {
  it("records writes, computed runs and effect runs per owner while recording", () => {
    const profiler = new Profiler();
    const s = signal(1);
    const doubled = computed(() => s() * 2);
    profiler.start();
    const owner = new Widget();
    const prev = setCurrentOwner(owner);
    createEffect(() => { s(); });
    setCurrentOwner(prev);
    createEffect(() => { s(); });
    s.set(2);
    doubled();
    const snap = profiler.snapshot();
    profiler.stop();

    expect(snap.recording).toBe(true);
    expect(snap.writes).toBe(1);
    expect(snap.computeRuns).toBe(1);
    expect(snap.effectRuns).toBe(4);
    expect(snap.owners.map((o) => o.name).sort()).toEqual(["(no component)", "Widget"]);
    expect(snap.owners.find((o) => o.name === "Widget")?.effectRuns).toBe(2);
  });

  it("merges owners with the same component name and keeps the slowest run", () => {
    const profiler = new Profiler();
    profiler.start();
    profiler.effect({} as never, 1, new Widget());
    profiler.effect({} as never, 5, new Widget());
    profiler.effect({} as never, 2, new Widget());
    const [widget] = profiler.snapshot().owners;
    expect(widget).toMatchObject({ name: "Widget", effectRuns: 3, effectMs: 8, maxMs: 5 });
    profiler.stop();
  });

  it("orders owners by time, then by runs", () => {
    const profiler = new Profiler();
    class A {}
    class B {}
    class C {}
    profiler.effect({} as never, 1, new A());
    profiler.effect({} as never, 3, new B());
    profiler.effect({} as never, 1, new C());
    profiler.effect({} as never, 0, new C());
    expect(profiler.snapshot().owners.map((o) => o.name)).toEqual(["B", "C", "A"]);
  });

  it("records nothing outside start/stop or while muted, and start/stop are idempotent", () => {
    const profiler = new Profiler();
    const s = signal(0);
    createEffect(() => { s(); });
    s.set(1);
    profiler.start();
    profiler.start();
    expect(profiler.isRecording).toBe(true);
    profiler.muted(() => { s.set(2); });
    profiler.stop();
    profiler.stop();
    s.set(3);
    const snap = profiler.snapshot();
    expect(snap.recording).toBe(false);
    expect(snap.writes).toBe(0);
    expect(snap.effectRuns).toBe(0);
    expect(snap.duration).toBeGreaterThanOrEqual(0);
  });

  it("drops muted computed and effect reports", () => {
    const profiler = new Profiler();
    profiler.muted(() => {
      profiler.compute({} as never, 1);
      profiler.effect({} as never, 1, undefined);
    });
    expect(profiler.snapshot().computeRuns).toBe(0);
    expect(profiler.snapshot().effectRuns).toBe(0);
  });

  it("notifies listeners once per task however many events happen", () => {
    vi.useFakeTimers();
    const profiler = new Profiler();
    const listener = vi.fn();
    profiler.bus.on("profile:changed", listener);
    profiler.reset();
    profiler.write({} as never);
    profiler.write({} as never);
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("restores the observer that was installed before it", () => {
    const outer = new Profiler();
    const inner = new Profiler();
    outer.start();
    inner.start();
    inner.stop();
    const s = signal(0);
    s.set(1);
    expect(outer.snapshot().writes).toBe(1);
    outer.stop();
  });
});
