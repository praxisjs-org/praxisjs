import { describe, it, expect, vi } from "vitest";

import { batch } from "../signal/batch";
import { computed } from "../signal/computed";
import { effect } from "../signal/effect";
import { selector } from "../signal/selector";
import { signal } from "../signal/signal";

function trackKeys(isSelected: (key: number) => boolean, count: number) {
  const runs = new Array<number>(count).fill(0);
  const results = new Array<boolean>(count).fill(false);
  const stops = Array.from({ length: count }, (_, key) =>
    effect(() => {
      runs[key]++;
      results[key] = isSelected(key);
    }),
  );
  return { runs, results, stops };
}

describe("selector", () => {
  it("compares a key against the source when read outside an effect", () => {
    const selected = signal(2);
    const source = vi.fn(() => selected());
    const isSelected = selector(source);
    expect(isSelected(2)).toBe(true);
    expect(isSelected(3)).toBe(false);
    expect(source).toHaveBeenCalledTimes(2);
    selected.set(3);
    expect(isSelected(3)).toBe(true);
  });

  it("re-runs only the effects of the previous and next keys", () => {
    const selected = signal(1);
    const isSelected = selector(() => selected());
    const { runs, results } = trackKeys(isSelected, 1000);
    expect(results[1]).toBe(true);
    expect(runs.every((r) => r === 1)).toBe(true);

    selected.set(500);

    expect(results[1]).toBe(false);
    expect(results[500]).toBe(true);
    expect(runs[1]).toBe(2);
    expect(runs[500]).toBe(2);
    expect(runs.reduce((a, b) => a + b, 0)).toBe(1002);
  });

  it("shares one key between several effects", () => {
    const selected = signal(1);
    const isSelected = selector(() => selected());
    const first = trackKeys(isSelected, 3);
    const second = trackKeys(isSelected, 3);
    selected.set(2);
    expect(first.results).toEqual([false, false, true]);
    expect(second.results).toEqual([false, false, true]);
    expect(second.runs).toEqual([1, 2, 2]);
  });

  it("reads the cached source value outside an effect while subscribed", () => {
    const selected = signal(1);
    const source = vi.fn(() => selected());
    const isSelected = selector(source);
    const stop = effect(() => { isSelected(1); });
    expect(source).toHaveBeenCalledTimes(1);
    expect(isSelected(1)).toBe(true);
    expect(source).toHaveBeenCalledTimes(1);
    stop();
  });

  it("does not notify when the new value matches the old one under SameValueZero", () => {
    const selected = signal(0);
    const isSelected = selector(() => selected());
    const { runs } = trackKeys(isSelected, 1);
    selected.set(-0);
    expect(runs[0]).toBe(1);
  });

  it("treats NaN as equal to NaN", () => {
    const selected = signal(1);
    const isSelected = selector(() => selected());
    let nanRuns = 0;
    let nanSelected = false;
    effect(() => {
      nanRuns++;
      nanSelected = isSelected(Number.NaN);
    });
    selected.set(Number.NaN);
    expect(nanSelected).toBe(true);
    expect(nanRuns).toBe(2);
  });

  it("skips notification when no effect reads the old or new key", () => {
    const selected = signal(1);
    const isSelected = selector(() => selected());
    const { runs } = trackKeys(isSelected, 3);
    selected.set(10);
    selected.set(20);
    expect(runs).toEqual([1, 2, 1]);
  });

  it("notifies the buckets whose result changes under a custom equality", () => {
    const selectedIds = signal<number[]>([1]);
    const equals = vi.fn((key: number, ids: number[]) => ids.includes(key));
    const isSelected = selector(() => selectedIds(), equals);
    const { runs, results } = trackKeys(isSelected, 5);

    selectedIds.set([1, 3, 4]);
    expect(results).toEqual([false, true, false, true, true]);
    expect(runs).toEqual([1, 1, 1, 2, 2]);

    selectedIds.set([1, 3, 4]);
    expect(runs).toEqual([1, 1, 1, 2, 2]);
  });

  it("re-runs an effect that reads both affected keys once", () => {
    const selected = signal(1);
    const isSelected = selector(() => selected());
    let runs = 0;
    effect(() => {
      runs++;
      isSelected(1);
      isSelected(2);
    });
    selected.set(2);
    expect(runs).toBe(2);
  });

  it("stops reading the source a microtask after every subscriber is disposed", async () => {
    const selected = signal(1);
    const source = vi.fn(() => selected());
    const isSelected = selector(source);
    const { stops } = trackKeys(isSelected, 3);
    expect(source).toHaveBeenCalledTimes(1);

    stops[0]();
    stops[1]();
    selected.set(2);
    expect(source).toHaveBeenCalledTimes(2);

    stops[2]();
    await Promise.resolve();
    selected.set(1);
    expect(source).toHaveBeenCalledTimes(2);

    const { results } = trackKeys(isSelected, 2);
    expect(source).toHaveBeenCalledTimes(3);
    expect(results[1]).toBe(true);
    selected.set(0);
    expect(results).toEqual([true, false]);
  });

  it("schedules one release when the last key empties more than once in the same tick", async () => {
    const selected = signal(1);
    const source = vi.fn(() => selected());
    const isSelected = selector(source);
    trackKeys(isSelected, 1).stops[0]();
    trackKeys(isSelected, 1).stops[0]();
    await Promise.resolve();
    selected.set(0);
    expect(source).toHaveBeenCalledTimes(1);
  });

  it("stays subscribed when a key is read again before the microtask", async () => {
    const selected = signal(1);
    const source = vi.fn(() => selected());
    const isSelected = selector(source);
    const [stop] = trackKeys(isSelected, 1).stops;
    stop();
    const { results } = trackKeys(isSelected, 2);
    await Promise.resolve();

    selected.set(0);
    expect(results).toEqual([true, false]);
    expect(source).toHaveBeenCalledTimes(2);
  });

  it("drops the bucket of a key an effect no longer reads", () => {
    const selected = signal(0);
    const key = signal(1);
    const equals = vi.fn((k: number, value: number) => k === value);
    const isSelected = selector(() => selected(), equals);
    effect(() => { isSelected(key()); });
    key.set(2);
    equals.mockClear();

    selected.set(5);
    expect(equals.mock.calls.map(([k]) => k)).toEqual([2, 2]);
  });

  it("does not re-read the source when its only subscriber re-runs", () => {
    const selected = signal(1);
    const source = vi.fn(() => selected());
    const isSelected = selector(source);
    let result = false;
    effect(() => { result = isSelected(2); });

    selected.set(2);
    expect(result).toBe(true);
    selected.set(3);
    expect(result).toBe(false);
    selected.set(2);
    expect(result).toBe(true);
    expect(source).toHaveBeenCalledTimes(4);
  });

  it("feeds a computed that reads a key", () => {
    const selected = signal(1);
    const isSelected = selector(() => selected());
    const label = computed(() => (isSelected(2) ? "on" : "off"));
    const values: string[] = [];
    effect(() => { values.push(label()); });
    selected.set(2);
    expect(label()).toBe("on");
    expect(values[0]).toBe("off");
  });

  it("notifies after the batch that changed the source", () => {
    const selected = signal(1);
    const isSelected = selector(() => selected());
    const { runs, results } = trackKeys(isSelected, 4);
    batch(() => {
      selected.set(2);
      selected.set(3);
      expect(results[3]).toBe(false);
    });
    expect(results).toEqual([false, false, false, true]);
    expect(runs).toEqual([1, 2, 1, 2]);
  });

  it("reads the new source value outside an effect before its subscribers are notified", async () => {
    const selected = signal(1);
    const isSelected = selector(() => selected());
    const { results, stops } = trackKeys(isSelected, 3);
    batch(() => {
      selected.set(2);
      expect(isSelected(2)).toBe(true);
      expect(isSelected(1)).toBe(false);
      expect(results).toEqual([false, true, false]);
    });
    expect(results).toEqual([false, false, true]);

    const doubled = computed(() => selected() * 2);
    const isDoubled = selector(doubled);
    const watched = trackKeys(isDoubled, 7);
    selected.set(3);
    expect(isDoubled(6)).toBe(true);
    expect(isDoubled(4)).toBe(false);
    await Promise.resolve();
    expect(watched.results[6]).toBe(true);
    for (const stop of [...stops, ...watched.stops]) stop();
  });
});
