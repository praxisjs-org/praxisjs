// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { signal } from "@praxisjs/core/internal";

// Import from index to cover re-exports
import { VirtualList, type VirtualItem } from "../index";

type AnyItem = { id: number };

function makeItems(count: number): AnyItem[] {
  return Array.from({ length: count }, (_, i) => ({ id: i }));
}

// ── VirtualList ───────────────────────────────────────────────────────────────

describe("VirtualList", () => {
  const ITEM_HEIGHT = 50;
  const VIEW_HEIGHT = 600;
  const BUFFER = 3;

  it("setup() returns computed signals for all four properties", () => {
    const ref = { current: null };
    const vl = new VirtualList(ref, () => makeItems(10), ITEM_HEIGHT);
    const view = vl.setup() as {
      visibleItems: () => VirtualItem<AnyItem>[];
      totalHeight: () => number;
      offsetTop: () => number;
      offsetBottom: () => number;
    };

    expect(typeof view.visibleItems).toBe("function");
    expect(typeof view.totalHeight).toBe("function");
    expect(typeof view.offsetTop).toBe("function");
    expect(typeof view.offsetBottom).toBe("function");
  });

  it("totalHeight = items.length * itemHeight", () => {
    const ref = { current: null };
    const vl = new VirtualList(ref, () => makeItems(100), ITEM_HEIGHT);
    const { totalHeight } = vl.setup() as { totalHeight: () => number };
    expect(totalHeight()).toBe(100 * ITEM_HEIGHT);
  });

  it("offsetTop = 0 when scrolled to top", () => {
    const ref = { current: null };
    const vl = new VirtualList(ref, () => makeItems(100), ITEM_HEIGHT);
    const { offsetTop } = vl.setup() as { offsetTop: () => number };
    expect(offsetTop()).toBe(0);
  });

  it("visibleItems starts at index 0 with buffer window", () => {
    const ref = { current: null };
    // default viewHeight=600, buffer=3, scrollTop=0
    // startIdx = max(0, floor(0/50) - 3) = 0
    // endIdx   = min(99, ceil((0+600)/50) + 3) = min(99, 12+3) = 15
    const vl = new VirtualList(ref, () => makeItems(100), ITEM_HEIGHT, BUFFER);
    const { visibleItems } = vl.setup() as { visibleItems: () => VirtualItem<AnyItem>[] };

    const items = visibleItems();
    expect(items[0].index).toBe(0);
    expect(items[items.length - 1].index).toBe(15);
  });

  it("visibleItems contains the correct item references", () => {
    const source = makeItems(20);
    const ref = { current: null };
    const vl = new VirtualList(ref, () => source, ITEM_HEIGHT, 0);
    const { visibleItems } = vl.setup() as { visibleItems: () => VirtualItem<AnyItem>[] };

    const items = visibleItems();
    expect(items[0].item).toBe(source[0]);
    expect(items[0].index).toBe(0);
  });

  it("offsetBottom reflects the hidden rows below the window", () => {
    const ref = { current: null };
    // startIdx=0, endIdx=15, total=100
    // offsetBottom = max(0, 100-1-15) * 50 = 84 * 50 = 4200
    const vl = new VirtualList(ref, () => makeItems(100), ITEM_HEIGHT, BUFFER);
    const { offsetBottom } = vl.setup() as { offsetBottom: () => number };
    expect(offsetBottom()).toBe((100 - 1 - 15) * ITEM_HEIGHT);
  });

  it("empty list: all offsets are 0 and visibleItems is empty", () => {
    const ref = { current: null };
    const vl = new VirtualList(ref, () => [], ITEM_HEIGHT);
    const { visibleItems, totalHeight, offsetTop, offsetBottom } = vl.setup() as {
      visibleItems: () => VirtualItem<AnyItem>[];
      totalHeight: () => number;
      offsetTop: () => number;
      offsetBottom: () => number;
    };

    expect(visibleItems()).toHaveLength(0);
    expect(totalHeight()).toBe(0);
    expect(offsetTop()).toBe(0);
    expect(offsetBottom()).toBe(0);
  });
});

// ── VirtualList — onMount ─────────────────────────────────────────────────────

describe("VirtualList — onMount", () => {
  const ITEM_HEIGHT = 50;

  it("onMount() with null ref is a no-op", () => {
    const ref = { current: null };
    const vl = new VirtualList(ref, () => makeItems(10), ITEM_HEIGHT);
    vl.setup();
    expect(() => vl.onMount()).not.toThrow();
  });

  it("onMount() sets viewHeight from container's clientHeight when > 0", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "clientHeight", { value: 400, configurable: true });

    const ref = { current: el };
    const vl = new VirtualList(ref, () => makeItems(100), ITEM_HEIGHT, 0);
    const { visibleItems } = vl.setup() as { visibleItems: () => VirtualItem<AnyItem>[] };
    vl.onMount();

    // With viewHeight=400 and no buffer: endIdx = min(99, ceil(400/50)-1) = 7
    // Visible range [0..7] = 8 items
    const items = visibleItems();
    expect(items.length).toBeLessThan(100);
    expect(items.length).toBeGreaterThan(0);
    // Specifically: ceil((0+400)/50) + 0 = 8; min(99, 8) = 8 → indices 0..8 = 9 items
    expect(items[items.length - 1].index).toBe(8);
  });

  it("onMount() does not override default viewHeight when clientHeight is 0", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "clientHeight", { value: 0, configurable: true });

    const ref = { current: el };
    const vl = new VirtualList(ref, () => makeItems(100), ITEM_HEIGHT, 0);
    const { visibleItems } = vl.setup() as { visibleItems: () => VirtualItem<AnyItem>[] };
    vl.onMount();

    // Default viewHeight=600 preserved; endIdx = min(99, ceil(600/50)) = 12
    const items = visibleItems();
    expect(items[items.length - 1].index).toBe(12);
  });

  it("onMount() registers a scroll listener that updates the window", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "clientHeight", { value: 0, configurable: true });

    const ref = { current: el };
    const vl = new VirtualList(ref, () => makeItems(100), ITEM_HEIGHT, 0);
    const { offsetTop } = vl.setup() as { offsetTop: () => number };
    vl.onMount();

    expect(offsetTop()).toBe(0);

    Object.defineProperty(el, "scrollTop", { value: 500, configurable: true });
    el.dispatchEvent(new Event("scroll"));

    // scrollTop=500, buffer=0: startIdx = floor(500/50) = 10; offsetTop = 10*50 = 500
    expect(offsetTop()).toBe(500);
  });
});

// ── VirtualList — onUnmount ───────────────────────────────────────────────────

describe("VirtualList — onUnmount", () => {
  const ITEM_HEIGHT = 50;

  it("onUnmount() removes the scroll listener", () => {
    const el = document.createElement("div");
    const remove = vi.spyOn(el, "removeEventListener");

    const ref = { current: el };
    const vl = new VirtualList(ref, () => makeItems(50), ITEM_HEIGHT);
    vl.setup();
    vl.onMount();
    vl.onUnmount();

    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("onUnmount() without prior onMount() does not throw", () => {
    const ref = { current: null };
    const vl = new VirtualList(ref, () => makeItems(10), ITEM_HEIGHT);
    vl.setup();
    expect(() => vl.onUnmount()).not.toThrow();
  });
});

// ── VirtualList — reactive getItems ──────────────────────────────────────────

describe("VirtualList — reactive getItems", () => {
  it("visibleItems updates when the source signal changes", () => {
    const itemsSignal = signal(makeItems(5));
    const ref = { current: null };
    const vl = new VirtualList(ref, () => itemsSignal(), 50);
    const { visibleItems, totalHeight } = vl.setup() as {
      visibleItems: () => VirtualItem<AnyItem>[];
      totalHeight: () => number;
    };

    expect(totalHeight()).toBe(250);
    expect(visibleItems()).toHaveLength(5);

    itemsSignal.set(makeItems(10));
    expect(totalHeight()).toBe(500);
    expect(visibleItems()).toHaveLength(10);
  });
});
