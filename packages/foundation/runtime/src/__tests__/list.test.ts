// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";

import { StatelessComponent } from "@praxisjs/core";
import { batch, signal } from "@praxisjs/core/internal";

import { mountComponent } from "../component";
import { getCurrentScope, runInScope } from "../context";
import { mountElement } from "../element";
import { For, Index, longestIncreasingSubsequence, type ListTransition } from "../list";
import { mountReactive } from "../reactive";
import { Scope } from "../scope";

interface Item {
  id: number;
  label?: string;
}

const items = (...ids: number[]): Item[] => ids.map((id) => ({ id }));
const range = (n: number, from = 0): Item[] => Array.from({ length: n }, (_, i) => ({ id: from + i }));

function mountInto(parent: Node, ctor: unknown, props: Record<string, unknown>, scope = new Scope()): Scope {
  runInScope(scope, () => {
    for (const node of mountComponent(ctor as never, props, scope)) parent.appendChild(node);
  });
  return scope;
}

function setup(props: Record<string, unknown>, ctor: unknown = For) {
  const parent = document.createElement("tbody");
  document.body.appendChild(parent);
  const scope = mountInto(parent, ctor, props);
  const rows = () => Array.from(parent.children) as HTMLElement[];
  const text = () => rows().map((r) => r.textContent).join(",");
  return { parent, scope, rows, text };
}

function rowOf(item: () => Item): HTMLElement {
  return mountElement("tr", { children: String(item().id) }, new Scope()) as HTMLElement;
}

// The runtime package has no Node typings; tests still flip NODE_ENV to exercise production paths.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;

function spyDom(parent: Node) {
  return {
    insert: vi.spyOn(parent, "insertBefore"),
    remove: vi.spyOn(parent, "removeChild"),
    append: vi.spyOn(parent, "appendChild"),
  };
}

function lisLength(values: number[]): number {
  const tails: number[] = [];
  for (const v of values) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = v;
  }
  return tails.length;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

// ── minimal DOM work ─────────────────────────────────────────────────────────

describe("For — minimal DOM work", () => {
  it("swapping 2 of 1000 rows moves exactly those 2 rows", () => {
    const list = signal(range(1000));
    const render = vi.fn(rowOf);
    const { parent, rows } = setup({ each: list, by: "id", children: render });
    const before = rows();
    const dom = spyDom(parent);
    const next = list().slice();
    [next[1], next[998]] = [next[998], next[1]];
    list.set(next);
    expect(dom.insert).toHaveBeenCalledTimes(2);
    expect(dom.remove).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1000);
    const after = rows();
    expect(after[1]).toBe(before[998]);
    expect(after[998]).toBe(before[1]);
    expect(after[500]).toBe(before[500]);
  });

  it("swapping two adjacent rows moves one row", () => {
    const list = signal(range(10));
    const { parent, text } = setup({ each: list, by: "id", children: rowOf });
    const dom = spyDom(parent);
    const next = list().slice();
    [next[4], next[5]] = [next[5], next[4]];
    list.set(next);
    expect(dom.insert).toHaveBeenCalledTimes(1);
    expect(text()).toBe("0,1,2,3,5,4,6,7,8,9");
  });

  it("removing 1 row removes only that row", () => {
    const list = signal(range(1000));
    const { parent, rows } = setup({ each: list, by: "id", children: rowOf });
    const before = rows();
    const dom = spyDom(parent);
    list.set(list().filter((r) => r.id !== 500));
    expect(dom.remove).toHaveBeenCalledTimes(1);
    expect(dom.insert).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(999);
    expect(rows()[500]).toBe(before[501]);
  });

  it("appending creates only the new rows, in one insertion", () => {
    const list = signal(range(1000));
    const render = vi.fn(rowOf);
    const { parent, rows, text } = setup({ each: list, by: "id", children: render });
    const first = rows()[0];
    render.mockClear();
    const dom = spyDom(parent);
    list.set(list().concat(range(1000, 1000)));
    expect(render).toHaveBeenCalledTimes(1000);
    expect(dom.insert).toHaveBeenCalledTimes(1);
    expect(dom.insert.mock.calls[0][0]).toBeInstanceOf(DocumentFragment);
    expect(rows()).toHaveLength(2000);
    expect(rows()[0]).toBe(first);
    expect(text().endsWith("1998,1999")).toBe(true);
  });

  it("prepending creates only the new rows, before the first one", () => {
    const list = signal(range(3, 10));
    const render = vi.fn(rowOf);
    const { parent, rows, text } = setup({ each: list, by: "id", children: render });
    const first = rows()[0];
    render.mockClear();
    const dom = spyDom(parent);
    list.set(range(3).concat(list()));
    expect(render).toHaveBeenCalledTimes(3);
    expect(dom.insert).toHaveBeenCalledTimes(1);
    expect(dom.insert.mock.calls[0][1]).toBe(first);
    expect(text()).toBe("0,1,2,10,11,12");
  });

  it("inserting one row in the middle inserts a single node", () => {
    const list = signal(range(5));
    const { parent, text } = setup({ each: list, by: "id", children: rowOf });
    const dom = spyDom(parent);
    const next = list().slice();
    next.splice(2, 0, { id: 99 });
    list.set(next);
    expect(dom.insert).toHaveBeenCalledTimes(1);
    expect(dom.insert.mock.calls[0][0]).toBeInstanceOf(HTMLTableRowElement);
    expect(text()).toBe("0,1,99,2,3,4");
  });

  it("an unchanged list does no DOM work and renders nothing", () => {
    const list = signal(range(50));
    const render = vi.fn(rowOf);
    const { parent } = setup({ each: list, by: "id", children: render });
    render.mockClear();
    const dom = spyDom(parent);
    list.set(list().slice());
    list.set(list().map((r) => ({ ...r })));
    expect(dom.insert).not.toHaveBeenCalled();
    expect(dom.remove).not.toHaveBeenCalled();
    expect(dom.append).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it("moving one row anywhere is a single move (head → later, tail → earlier)", () => {
    const list = signal(range(1000));
    const { parent, text } = setup({ each: list, by: "id", children: rowOf });
    const dom = spyDom(parent);

    const forward = list().slice();
    forward.splice(500, 0, forward.splice(5, 1)[0]);
    list.set(forward);
    expect(dom.insert).toHaveBeenCalledTimes(1);

    const back = list().slice();
    back.splice(3, 0, back.splice(900, 1)[0]);
    list.set(back);
    expect(dom.insert).toHaveBeenCalledTimes(2);
    expect(text()).toBe(back.map((r) => r.id).join(","));
  });

  it("reverse uses n - 1 moves (the LIS minimum)", () => {
    const list = signal(range(100));
    const { parent, text } = setup({ each: list, by: "id", children: rowOf });
    const dom = spyDom(parent);
    list.set(list().slice().reverse());
    expect(dom.insert).toHaveBeenCalledTimes(99);
    expect(text()).toBe(range(100).reverse().map((r) => r.id).join(","));
  });

  it("shuffle moves exactly the rows outside the longest increasing subsequence", () => {
    const list = signal(range(300));
    const { parent, rows, text } = setup({ each: list, by: "id", children: rowOf });
    const before = new Set(rows());
    let seed = 7;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const shuffled = list().slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const dom = spyDom(parent);
    list.set(shuffled);
    expect(dom.insert).toHaveBeenCalledTimes(300 - lisLength(shuffled.map((r) => r.id)));
    expect(dom.remove).not.toHaveBeenCalled();
    expect(text()).toBe(shuffled.map((r) => r.id).join(","));
    expect(rows().every((r) => before.has(r))).toBe(true);
  });

  it("mixed update: removes, inserts and moves in one pass", () => {
    const list = signal(range(8));
    const { text, rows } = setup({ each: list, by: "id", children: rowOf });
    const kept = rows()[3];
    list.set(items(0, 7, 3, 100, 5, 2, 101));
    expect(text()).toBe("0,7,3,100,5,2,101");
    expect(rows()[2]).toBe(kept);
  });

  it("removes rows in the middle while keeping order (no moves)", () => {
    const list = signal(range(10));
    const { parent, text } = setup({ each: list, by: "id", children: rowOf });
    const dom = spyDom(parent);
    list.set(items(0, 2, 4, 50, 6, 8, 9));
    expect(dom.remove).toHaveBeenCalledTimes(4);
    expect(dom.insert).toHaveBeenCalledTimes(1);
    expect(text()).toBe("0,2,4,50,6,8,9");
  });
});

// ── fast paths ───────────────────────────────────────────────────────────────

describe("For — fast paths", () => {
  it("empty → N inserts one DocumentFragment", () => {
    const list = signal<Item[]>([]);
    const { parent, text } = setup({ each: list, by: "id", children: rowOf });
    const dom = spyDom(parent);
    list.set(range(32));
    expect(dom.insert).toHaveBeenCalledTimes(1);
    expect(dom.insert.mock.calls[0][0]).toBeInstanceOf(DocumentFragment);
    expect(text().split(",")).toHaveLength(32);
  });

  it("empty → many fills an owned parent while it is detached, then puts it back in place", () => {
    const list = signal<Item[]>([]);
    const { parent, text } = setup({ each: list, by: "id", children: rowOf });
    const next = document.createElement("hr");
    document.body.appendChild(next);
    document.body.insertBefore(parent, next);
    const [start, end] = [parent.firstChild, parent.lastChild];
    const dom = spyDom(parent);
    const connected: boolean[] = [];
    dom.append.mockImplementation(function (this: Node, node: Node) {
      connected.push(parent.isConnected);
      return Node.prototype.appendChild.call(this, node) as Node;
    });
    list.set(range(100));
    expect(dom.insert).not.toHaveBeenCalled();
    expect(connected.slice(0, -1).every((c) => !c)).toBe(true);
    expect(parent.nextSibling).toBe(next);
    expect(parent.firstChild).toBe(start);
    expect(parent.lastChild).toBe(end);
    expect(text().split(",")).toHaveLength(100);
  });

  it.each([
    ["the parent holds focus", (parent: HTMLElement) => {
      parent.tabIndex = 0;
      parent.focus();
    }],
    ["the parent is not a plain container", null],
    ["the parent runs a CSS animation", (parent: HTMLElement) => {
      Object.assign(parent, { getAnimations: () => [{}] });
    }],
    ["the parent is a showing popover", (parent: HTMLElement) => { parent.setAttribute("popover", ""); }],
    ["the parent is not in the document", (parent: HTMLElement) => { parent.remove(); }],
  ] as const)("empty → many keeps the fragment path when %s", (reason, prepare) => {
    const list = signal<Item[]>([]);
    const parent = document.createElement(reason.includes("plain") ? "dialog" : "tbody");
    document.body.appendChild(parent);
    mountInto(parent, For, { each: list, by: "id", children: rowOf });
    prepare?.(parent);
    const dom = spyDom(parent);
    list.set(range(100));
    expect(dom.insert).toHaveBeenCalledTimes(1);
    expect(dom.insert.mock.calls[0][0]).toBeInstanceOf(DocumentFragment);
    expect(parent.children).toHaveLength(100);
  });

  it("empty → many keeps the fragment path when the list does not own the whole parent", () => {
    const list = signal<Item[]>([]);
    const parent = document.createElement("tbody");
    document.body.appendChild(parent);
    mountInto(parent, For, { each: list, by: "id", children: rowOf });
    parent.appendChild(document.createElement("tr"));
    const dom = spyDom(parent);
    list.set(range(100));
    expect(dom.insert.mock.calls[0][0]).toBeInstanceOf(DocumentFragment);
    expect(parent.children).toHaveLength(101);
  });

  it("empty → 1 inserts the row directly", () => {
    const list = signal<Item[]>([]);
    const { parent, text } = setup({ each: list, by: "id", children: rowOf });
    const dom = spyDom(parent);
    list.set(items(1));
    expect(dom.insert).toHaveBeenCalledTimes(1);
    expect(dom.insert.mock.calls[0][0]).toBeInstanceOf(HTMLTableRowElement);
    expect(text()).toBe("1");
  });

  it("N → empty clears an owned parent with textContent and restores the anchors", () => {
    const list = signal(range(100));
    const { parent } = setup({ each: list, by: "id", children: rowOf });
    const [start, end] = [parent.firstChild, parent.lastChild];
    const dom = spyDom(parent);
    list.set([]);
    expect(dom.remove).not.toHaveBeenCalled();
    expect(Array.from(parent.childNodes)).toEqual([start, end]);
    list.set(items(1, 2));
    expect(parent.children).toHaveLength(2);
  });

  it("N → empty walks the range when the parent has other children", () => {
    const list = signal(range(5));
    const parent = document.createElement("div");
    const before = document.createElement("header");
    const after = document.createElement("footer");
    parent.appendChild(before);
    mountInto(parent, For, { each: list, by: "id", children: rowOf });
    parent.appendChild(after);
    list.set([]);
    expect(Array.from(parent.children)).toEqual([before, after]);
  });

  it("full replace with no common keys clears and inserts once", () => {
    const list = signal(range(100));
    const render = vi.fn(rowOf);
    const { parent, text } = setup({ each: list, by: "id", children: render });
    render.mockClear();
    const dom = spyDom(parent);
    list.set(range(100, 1000));
    expect(render).toHaveBeenCalledTimes(100);
    // No row is removed one by one: at most the end anchor is lifted out while the parent refills.
    expect(dom.remove.mock.calls.every(([node]) => node.nodeType === Node.COMMENT_NODE)).toBe(true);
    expect(dom.insert.mock.calls.length).toBeLessThanOrEqual(1);
    expect(text().startsWith("1000,1001")).toBe(true);
  });

  it("partial replace (common prefix, no common keys in the middle) removes the span and inserts once", () => {
    const list = signal(range(6));
    const parent = document.createElement("div");
    const tail = document.createElement("aside");
    mountInto(parent, For, { each: list, by: "id", children: rowOf });
    parent.appendChild(tail);
    list.set(items(0, 10, 11, 12, 5));
    expect(Array.from(parent.children).map((c) => c.textContent)).toEqual(["0", "10", "11", "12", "5", ""]);
    list.set(items(20, 21));
    expect(Array.from(parent.children).map((c) => c.textContent)).toEqual(["20", "21", ""]);
  });
});

// ── items, keys and indices ──────────────────────────────────────────────────

describe("For — items and indices", () => {
  it("same key with a new object updates item() bindings without recreating the row", () => {
    const list = signal<Item[]>([{ id: 1, label: "a" }, { id: 2, label: "b" }]);
    const scope = new Scope();
    const parent = document.createElement("tbody");
    runInScope(scope, () => {
      for (const n of mountComponent(For as never, {
        each: list,
        by: "id",
        children: (item: () => Item) => mountElement("tr", { children: () => item().label }, scope),
      }, scope)) parent.appendChild(n);
    });
    const first = parent.children[0];
    list.set([{ id: 1, label: "A" }, { id: 2, label: "b" }]);
    expect(parent.children[0]).toBe(first);
    expect(parent.textContent).toBe("Ab");
  });

  it("an untracked item() read is a snapshot and allocates nothing reactive", () => {
    const list = signal<Item[]>([{ id: 1, label: "a" }]);
    const { parent } = setup({
      each: list,
      by: (item: Item) => item.id,
      children: (item: () => Item) => mountElement("tr", { children: item().label }, new Scope()),
    });
    list.set([{ id: 1, label: "b" }]);
    expect(parent.textContent).toBe("a");
  });

  it("without `by`, the item itself is the key and item() is constant", () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const list = signal([a, b]);
    const seen: Item[] = [];
    const { text, rows } = setup({
      each: list,
      children: (item: () => Item) => {
        seen.push(item());
        return rowOf(item);
      },
    });
    const rowB = rows()[1];
    list.set([b, a]);
    expect(text()).toBe("2,1");
    expect(rows()[0]).toBe(rowB);
    list.set([b, { id: 1 }]);
    expect(seen).toHaveLength(3);
  });

  it("moved rows see their new index reactively", () => {
    const list = signal(range(4));
    const { text } = setup({
      each: list,
      by: "id",
      children: (item: () => Item, index: () => number) =>
        mountElement("tr", { children: () => `${String(item().id)}@${String(index())}` }, new Scope()),
    });
    expect(text()).toBe("0@0,1@1,2@2,3@3");
    list.set(items(3, 1, 2, 0));
    expect(text()).toBe("3@0,1@1,2@2,0@3");
    list.set(items(1, 2, 0));
    expect(text()).toBe("1@0,2@1,0@2");
    const moved = list().slice();
    moved.push(moved.shift() as Item);
    list.set(moved);
    expect(text()).toBe("2@0,0@1,1@2");
  });

  it("index() read untracked is the index at creation", () => {
    const list = signal(range(3));
    const { text } = setup({
      each: list,
      by: "id",
      children: (item: () => Item, index: () => number) =>
        mountElement("tr", { children: `${String(item().id)}@${String(index())}` }, new Scope()),
    });
    list.set(items(2, 1, 0));
    expect(text()).toBe("2@2,1@1,0@0");
  });

  it("a render that declares only the item parameter gets no index accessor", () => {
    const list = signal(range(2));
    const seen: unknown[] = [];
    setup({
      each: list,
      by: "id",
      children: function (item: () => Item) {
        // eslint-disable-next-line prefer-rest-params
        seen.push(typeof arguments[1]);
        return rowOf(item);
      },
    });
    expect(seen).toEqual(["number", "number"]);
  });

  it("accepts a static array, an iterable, a signal and null", () => {
    const fromArray = setup({ each: items(1, 2), children: rowOf });
    expect(fromArray.text()).toBe("1,2");
    const fromSet = setup({ each: new Set(items(3, 4)), children: rowOf });
    expect(fromSet.text()).toBe("3,4");
    const fromNull = setup({ each: null, children: rowOf, fallback: mountElement("tr", { children: "none" }, new Scope()) });
    expect(fromNull.text()).toBe("none");
    const source = signal<Item[] | undefined>(undefined);
    const fromSignal = setup({ each: () => source(), children: rowOf });
    expect(fromSignal.text()).toBe("");
    source.set(items(5));
    expect(fromSignal.text()).toBe("5");
  });

  it("the row render runs untracked: signals it reads don't re-run the list", () => {
    const list = signal(range(2));
    const other = signal(0);
    const render = vi.fn((item: () => Item) => {
      other();
      return rowOf(item);
    });
    const keyReads = signal(0);
    setup({ each: list, by: (item: Item) => item.id + keyReads() * 0, children: render });
    render.mockClear();
    other.set(1);
    keyReads.set(1);
    expect(render).not.toHaveBeenCalled();
  });
});

// ── row shapes ───────────────────────────────────────────────────────────────

class Cell extends StatelessComponent<{ value: number }> {
  static readonly __isComponent = true as const;
  static readonly __isStateless = true;
  static mounts = 0;
  static unmounts = 0;
  onMount() { Cell.mounts++; }
  onUnmount() { Cell.unmounts++; }
  render() {
    return mountElement("td", { children: String(this.props.value) }, new Scope());
  }
}

describe("For — row shapes", () => {
  function shaped(render: (item: () => Item) => unknown) {
    const list = signal(range(3));
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const scope = mountInto(parent, For, { each: list, by: "id", children: render });
    return { list, parent, scope };
  }

  it("multi-node rows move and are removed as a whole", () => {
    const { list, parent } = shaped((item) => [
      mountElement("dt", { children: String(item().id) }, new Scope()),
      mountElement("dd", { children: "-" }, new Scope()),
    ]);
    list.set(items(2, 0, 1));
    expect(parent.textContent).toBe("2-0-1-");
    list.set(items(0));
    expect(parent.textContent).toBe("0-");
  });

  it("rows whose top-level reactive child changes its nodes keep moving correctly", () => {
    const flags = [signal(false), signal(false), signal(false)];
    const { list, parent } = shaped((item) => [
      () => (flags[item().id]() ? [mountElement("i", { children: "x" }, new Scope()), "y"] : null),
      mountElement("b", { children: String(item().id) }, new Scope()),
    ]);
    flags[0].set(true);
    flags[2].set(true);
    expect(parent.textContent).toBe("xy01xy2");
    list.set(items(2, 1, 0));
    expect(parent.textContent).toBe("xy21xy0");
    flags[0].set(false);
    list.set(items(1, 0, 2));
    expect(parent.textContent).toBe("10xy2");
    list.set(items(1));
    expect(parent.textContent).toBe("1");
  });

  it("component rows mount once, never remount when moved, and unmount on removal", async () => {
    Cell.mounts = 0;
    Cell.unmounts = 0;
    const { list, parent } = shaped((item) => mountComponent(Cell as never, { value: item().id }, getCurrentScope()));
    await Promise.resolve();
    expect(Cell.mounts).toBe(3);
    list.set(items(2, 1, 0));
    await Promise.resolve();
    expect(parent.textContent).toBe("210");
    expect(Cell.mounts).toBe(3);
    list.set(items(2));
    expect(Cell.unmounts).toBe(2);
  });

  it("rows can render text, nothing, a fragment, or nested arrays", () => {
    const fragment = () => {
      const f = document.createDocumentFragment();
      f.appendChild(document.createTextNode("f"));
      f.appendChild(document.createTextNode("g"));
      return f;
    };
    const { list, parent } = shaped((item) => {
      const id = item().id;
      if (id === 0) return "t";
      if (id === 1) return [null, [false]];
      if (id === 2) return fragment();
      return [[null, [false, "n"]], [null, false], 5];
    });
    expect(parent.textContent).toBe("tfg");
    list.set(items(3, 2, 1, 0));
    expect(parent.textContent).toBe("n5fgt");
    list.set(items(1));
    expect(parent.textContent).toBe("");
    expect(parent.childNodes).toHaveLength(3);
  });

  it("a row's effects and listeners are cleaned up on removal and untouched by moves", () => {
    const tick = signal(0);
    const runs = vi.fn();
    const clicks = vi.fn();
    const { list, parent } = shaped((item) => mountElement("p", {
      onClick: clicks,
      children: () => {
        runs(item().id);
        return String(tick());
      },
    }, getCurrentScope()));
    runs.mockClear();
    const [a, b, c] = list();
    list.set([c, b, a]);
    expect(runs).not.toHaveBeenCalled();
    tick.set(1);
    expect(runs).toHaveBeenCalledTimes(3);
    const removed = parent.children[0] as HTMLElement;
    list.set([b, a]);
    runs.mockClear();
    tick.set(2);
    expect(runs).toHaveBeenCalledTimes(2);
    (parent.children[0] as HTMLElement).click();
    removed.click();
    expect(clicks).toHaveBeenCalledTimes(1);
  });
});

// ── lifecycle via row scope ──────────────────────────────────────────────────

describe("For — row scope", () => {
  it("bindings created in the row render belong to the row scope", () => {
    const tick = signal(0);
    const runs = vi.fn();
    const list = signal(range(3));
    const parent = document.createElement("div");
    const scope = new Scope();
    runInScope(scope, () => {
      for (const n of mountComponent(For as never, {
        each: list,
        by: "id",
        children: () => {
          const el = document.createElement("span");
          mountReactive(el, () => {
            runs();
            return String(tick());
          }, getRowScope());
          return el;
        },
      }, scope)) parent.appendChild(n);
    });
    runs.mockClear();
    list.set(items(0));
    tick.set(1);
    expect(runs).toHaveBeenCalledTimes(1);
    scope.dispose();
    tick.set(2);
    expect(runs).toHaveBeenCalledTimes(1);
  });
});

function getRowScope(): Scope {
  return getCurrentScope();
}

// ── duplicate keys ───────────────────────────────────────────────────────────

describe("For — duplicate keys", () => {
  it("warns naming the key and keeps a deterministic order", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const list = signal([{ id: 1, label: "a" }, { id: 1, label: "b" }, { id: 2, label: "c" }]);
    const { text } = setup({
      each: list,
      by: "id",
      children: (item: () => Item) => mountElement("tr", { children: () => item().label }, new Scope()),
    });
    expect(text()).toBe("a,b,c");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("the key 1 more than once"));
    list.set([{ id: 2, label: "c" }, { id: 1, label: "x" }, { id: 1, label: "y" }]);
    expect(text()).toBe("c,x,y");
    list.set([{ id: 1, label: "z" }]);
    expect(text()).toBe("z");
  });

  it("names string, object and symbol keys", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const obj = {};
    const sym = Symbol("s");
    setup({ each: ["a", "a", obj, obj, sym, sym], children: () => document.createElement("tr") });
    const messages = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(messages).toContain('the key "a"');
    expect(messages).toContain("the key [object Object]");
    expect(messages).toContain("the key Symbol(s)");
  });

  it("duplicates in the reordered middle are created fresh and old duplicates removed", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const list = signal(items(1, 2, 2, 3));
    const { text } = setup({ each: list, by: "id", children: rowOf });
    list.set(items(3, 2, 2, 2, 1));
    expect(text()).toBe("3,2,2,2,1");
    list.set(items(2));
    expect(text()).toBe("2");
  });

  it("does not warn in production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const prev = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      setup({ each: [1, 1], children: () => document.createElement("tr") });
    } finally {
      env.NODE_ENV = prev;
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it("neither throws nor warns when there is no `process` (no bundler)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("process", undefined);
    try {
      const { text } = setup({ each: [1, 1], children: (n: () => number) => mountElement("tr", { children: String(n()) }, new Scope()) });
      expect(text()).toBe("1,1");
      setup({ each: [1] });
    } finally {
      vi.unstubAllGlobals();
    }
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

// ── transitions ──────────────────────────────────────────────────────────────

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fakeTransition() {
  const leaves = new Map<string, ReturnType<typeof deferred>>();
  const entered: string[] = [];
  const transition: ListTransition = {
    enter: vi.fn((el: HTMLElement) => {
      entered.push(el.textContent ?? "");
      return Promise.resolve();
    }),
    leave: vi.fn((el: HTMLElement) => {
      const d = deferred();
      leaves.set(el.textContent ?? "", d);
      return d.promise;
    }),
  };
  return { transition, leaves, entered };
}

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe("For — transitions", () => {
  it("keeps a leaving row until leave resolves and excludes it from moves", async () => {
    const { transition, leaves } = fakeTransition();
    const list = signal(range(4));
    const { parent, text, rows } = setup({ each: list, by: "id", transition, children: rowOf });
    list.set(items(3, 2, 0));
    expect(text()).toBe("3,2,0,1");
    const leaving = rows()[3];
    const dom = spyDom(parent);
    list.set(items(0, 2, 3));
    expect(rows().filter((r) => r !== leaving).map((r) => r.textContent).join(",")).toBe("0,2,3");
    expect(parent.contains(leaving)).toBe(true);
    expect(dom.remove).not.toHaveBeenCalled();
    leaves.get("1")?.resolve();
    await flush();
    expect(text()).toBe("0,2,3");
  });

  it("re-adding a key mid-leave creates a new row while the old one finishes leaving", async () => {
    const { transition, leaves } = fakeTransition();
    const list = signal(range(3));
    const { rows, text } = setup({ each: list, by: "id", transition, children: rowOf });
    const old = rows()[1];
    list.set(items(0, 2));
    list.set(items(0, 1, 2));
    expect(text()).toBe("0,1,1,2");
    expect(rows().filter((r) => r.textContent === "1")).toContain(old);
    leaves.get("1")?.resolve();
    await flush();
    expect(text()).toBe("0,1,2");
    expect(rows()[1]).not.toBe(old);
  });

  it("runs enter on added rows (not on the first render unless appear)", async () => {
    const { transition, entered } = fakeTransition();
    const list = signal(range(2));
    setup({ each: list, by: "id", transition, children: rowOf });
    expect(entered).toEqual([]);
    list.set(range(4));
    await flush();
    expect(entered).toEqual(["2", "3"]);
    const appearing = fakeTransition();
    setup({ each: range(2), transition: appearing.transition, appear: true, children: rowOf });
    expect(appearing.entered).toEqual(["0", "1"]);
  });

  it("clearing with a leave transition leaves every row and then shows the fallback", async () => {
    const { transition, leaves } = fakeTransition();
    const list = signal(range(2));
    const fallback = mountElement("tr", { children: "empty" }, new Scope());
    const { text } = setup({ each: list, by: "id", transition, fallback, children: rowOf });
    list.set([]);
    expect(text()).toBe("0,1,empty");
    leaves.get("0")?.resolve();
    leaves.get("1")?.resolve();
    await flush();
    expect(text()).toBe("empty");
  });

  it("removes the row and reports the error when leave rejects or throws", async () => {
    const reported: unknown[] = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
      Promise.resolve().then(() => {
        try { cb(); } catch (e) { reported.push(e); }
      }, () => undefined);
    });
    const boom = new Error("leave failed");
    let mode: "reject" | "throw" = "reject";
    const transition: ListTransition = {
      leave: () => {
        if (mode === "throw") throw boom;
        return Promise.reject(boom);
      },
    };
    const list = signal(range(3));
    const { text } = setup({ each: list, by: "id", transition, children: rowOf });
    list.set(items(0, 2));
    await flush();
    expect(text()).toBe("0,2");
    mode = "throw";
    list.set(items(2));
    await flush();
    expect(text()).toBe("2");
    expect(reported).toEqual([boom, boom]);
  });

  it("reports enter errors without breaking the list", async () => {
    const reported: unknown[] = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
      Promise.resolve().then(() => {
        try { cb(); } catch (e) { reported.push(e); }
      }, () => undefined);
    });
    const boom = new Error("enter failed");
    let throwSync = false;
    const transition: ListTransition = {
      enter: () => {
        if (throwSync) throw boom;
        return Promise.reject(boom);
      },
    };
    const list = signal(range(1));
    const { text } = setup({ each: list, by: "id", transition, children: rowOf });
    list.set(range(2));
    throwSync = true;
    list.set(range(3));
    await flush();
    expect(text()).toBe("0,1,2");
    expect(reported).toEqual([boom, boom]);
  });

  it("calls the hooks as methods, so class-based transitions keep `this`", async () => {
    class Fade implements ListTransition {
      readonly calls: string[] = [];
      enter(el: HTMLElement) { this.calls.push(`enter ${el.textContent ?? ""}`); return Promise.resolve(); }
      leave(el: HTMLElement) { this.calls.push(`leave ${el.textContent ?? ""}`); return Promise.resolve(); }
    }
    const fade = new Fade();
    const list = signal(range(1));
    const { text } = setup({ each: list, by: "id", transition: fade, children: rowOf });
    list.set(items(1));
    await flush();
    expect(fade.calls).toEqual(["leave 0", "enter 1"]);
    expect(text()).toBe("1");
  });

  it("an enter-only transition keeps the bulk removal paths", () => {
    const transition: ListTransition = { enter: () => Promise.resolve() };
    const list = signal(range(3));
    const { parent } = setup({ each: list, by: "id", transition, children: rowOf });
    list.set([]);
    expect(parent.childNodes).toHaveLength(2);
  });

  it("disposing the list mid-leave disposes the leaving rows and skips the late removal", async () => {
    const { transition, leaves } = fakeTransition();
    const unmounted = vi.fn();
    const list = signal(range(2));
    const { scope, text } = setup({
      each: list,
      by: "id",
      transition,
      children: (item: () => Item) => {
        getCurrentScope().add(unmounted);
        return rowOf(item);
      },
    });
    list.set(items(0));
    expect(unmounted).not.toHaveBeenCalled();
    scope.dispose();
    expect(unmounted).toHaveBeenCalledTimes(2);
    leaves.get("1")?.resolve();
    await flush();
    expect(text()).toBe("0,1");
  });

  it("leaves every element of a multi-node row", async () => {
    const leave = vi.fn(() => Promise.resolve());
    const list = signal(range(2));
    const parent = document.createElement("dl");
    mountInto(parent, For, {
      each: list,
      by: "id",
      transition: { leave },
      children: (item: () => Item) => [
        mountElement("dt", { children: String(item().id) }, new Scope()),
        "text",
        mountElement("dd", { children: "-" }, new Scope()),
      ],
    });
    list.set(items(0));
    expect(leave).toHaveBeenCalledTimes(2);
    await flush();
    expect(parent.textContent).toBe("0text-");
  });

  it("removes a leaving row that is already detached without throwing", async () => {
    const { transition, leaves } = fakeTransition();
    const list = signal(range(2));
    const { parent, rows } = setup({ each: list, by: "id", transition, children: rowOf });
    const leaving = rows()[1];
    list.set(items(0));
    parent.removeChild(leaving);
    leaves.get("1")?.resolve();
    await flush();
    expect(parent.contains(leaving)).toBe(false);
  });

  it("works with @praxisjs/motion createTransition", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => { cb(0); }, 0));
    try {
      // Imported by path at runtime: @praxisjs/motion is not a dependency of the runtime package.
      const motion = "../../../../features/motion/src/transition";
      const { createTransition } = (await import(/* @vite-ignore */ motion)) as {
        createTransition: (options: { name: string; duration: number }) => ListTransition;
      };
      const list = signal(range(2));
      const { text, rows } = setup({ each: list, by: "id", transition: createTransition({ name: "fade", duration: 100 }), children: rowOf });
      list.set(items(0));
      expect(rows()[1].classList.contains("fade-leave-from")).toBe(true);
      await vi.advanceTimersByTimeAsync(150);
      expect(text()).toBe("0");
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});

// ── fallback ─────────────────────────────────────────────────────────────────

describe("For — fallback", () => {
  it("shows a static fallback while empty and reuses its node", () => {
    const fallback = mountElement("tr", { children: "empty" }, new Scope());
    const list = signal<Item[]>([]);
    const { parent, text } = setup({ each: list, by: "id", fallback, children: rowOf });
    expect(text()).toBe("empty");
    list.set(items(1));
    expect(text()).toBe("1");
    expect(parent.contains(fallback)).toBe(false);
    list.set([]);
    expect(parent.children[0]).toBe(fallback);
    list.set([]);
    expect(text()).toBe("empty");
  });

  it("disposes a visible fallback with the list", () => {
    const cleanup = vi.fn();
    const { scope } = setup({
      each: [],
      fallback: () => {
        getCurrentScope().add(cleanup);
        return "empty";
      },
      children: rowOf,
    });
    scope.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("mounts a function fallback reactively and disposes it when rows appear", () => {
    const label = signal("none");
    const runs = vi.fn();
    const list = signal<Item[]>([]);
    const { text } = setup({
      each: list,
      by: "id",
      fallback: () => {
        runs();
        return mountElement("tr", { children: label() }, new Scope());
      },
      children: rowOf,
    });
    expect(text()).toBe("none");
    label.set("nothing");
    expect(text()).toBe("nothing");
    list.set(items(1));
    runs.mockClear();
    label.set("x");
    expect(runs).not.toHaveBeenCalled();
    expect(text()).toBe("1");
  });
});

// ── nesting ──────────────────────────────────────────────────────────────────

describe("For — nesting", () => {
  it("For inside For keeps inner rows while the outer rows move", () => {
    const groups = signal([
      { id: 1, children: signal(items(10, 11)) },
      { id: 2, children: signal(items(20)) },
    ]);
    const parent = document.createElement("div");
    mountInto(parent, For, {
      each: groups,
      by: "id",
      children: (group: () => { id: number; children: ReturnType<typeof signal<Item[]>> }) => {
        const scope = getCurrentScope();
        const section = document.createElement("section");
        for (const n of mountComponent(For as never, {
          each: group().children,
          by: "id",
          children: (item: () => Item) => mountElement("p", { children: String(item().id) }, scope),
        }, scope)) section.appendChild(n);
        return section;
      },
    });
    const inner = parent.querySelector("p");
    groups.set(groups().slice().reverse());
    expect(parent.textContent).toBe("201011");
    groups()[1].children.set(items(11, 10, 12));
    expect(parent.textContent).toBe("20111012");
    expect(Array.from(parent.querySelectorAll("p"))).toContain(inner);
  });

  it("an inner list that owns its section still clears with textContent after the outer moves", () => {
    const inner = signal(items(1, 2));
    const outer = signal(items(1, 2));
    const parent = document.createElement("div");
    mountInto(parent, For, {
      each: outer,
      by: "id",
      children: (item: () => Item) => {
        const scope = getCurrentScope();
        const section = document.createElement("section");
        if (item().id === 1) {
          for (const n of mountComponent(For as never, { each: inner, by: "id", children: rowOf }, scope)) section.appendChild(n);
        }
        return section;
      },
    });
    outer.set(items(2, 1));
    inner.set([]);
    expect(parent.querySelectorAll("tr")).toHaveLength(0);
    inner.set(items(3));
    expect(parent.lastElementChild?.textContent).toBe("3");
  });

  it("For inside a conditional disposes its rows when hidden", () => {
    const show = signal(true);
    const unmounted = vi.fn();
    const parent = document.createElement("div");
    const scope = new Scope();
    runInScope(scope, () => {
      mountReactive(parent, () => (show()
        ? mountComponent(For as never, {
          each: range(3),
          children: (item: () => Item) => {
            getCurrentScope().add(unmounted);
            return rowOf(item);
          },
        }, getCurrentScope())
        : null), scope);
    });
    expect(parent.querySelectorAll("tr")).toHaveLength(3);
    show.set(false);
    expect(unmounted).toHaveBeenCalledTimes(3);
    expect(parent.querySelectorAll("tr")).toHaveLength(0);
  });
});

// ── batching ─────────────────────────────────────────────────────────────────

describe("For — batching", () => {
  it("several writes in one batch reconcile once", () => {
    const list = signal(range(3));
    const each = vi.fn(() => list());
    setup({ each, by: "id", children: rowOf });
    each.mockClear();
    batch(() => {
      list.set(range(4));
      list.set(range(5));
      list.set(items(4, 3, 2, 1, 0));
    });
    expect(each).toHaveBeenCalledTimes(1);
  });

  it("several writes in one event handler reconcile once", () => {
    const list = signal(range(3));
    const each = vi.fn(() => list());
    const { parent } = setup({ each, by: "id", children: rowOf });
    each.mockClear();
    const button = mountElement("button", {
      onClick: () => {
        list.set(range(4));
        list.set(items(3, 2, 1, 0));
      },
    }, new Scope()) as HTMLButtonElement;
    button.click();
    expect(each).toHaveBeenCalledTimes(1);
    expect(Array.from(parent.children).map((c) => c.textContent).join(",")).toBe("3,2,1,0");
  });
});

// ── errors ───────────────────────────────────────────────────────────────────

describe("For — errors", () => {
  it("a throwing row render leaves the rest of the list intact and retries on the next update", () => {
    const failing = new Set([1]);
    const list = signal(range(3));
    const reported: unknown[] = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
      try { cb(); } catch (e) { reported.push(e); }
    });
    const { text } = setup({
      each: list,
      by: "id",
      children: (item: () => Item) => {
        if (failing.has(item().id)) throw new Error(`row ${String(item().id)}`);
        return rowOf(item);
      },
    });
    expect(text()).toBe("0,2");
    expect(reported).toHaveLength(1);
    failing.clear();
    list.set(range(3));
    expect(text()).toBe("0,1,2");
    failing.add(5);
    expect(() => { list.set(range(6)); }).toThrow("row 5");
    expect(text()).toBe("0,1,2,3,4");
    failing.add(6);
    failing.add(7);
    expect(() => { list.set(range(8)); }).toThrow(AggregateError);
    expect(text()).toBe("0,1,2,3,4");
  });

  it("removes the nodes a row appended before its render failed", () => {
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => undefined);
    const parent = document.createElement("div");
    mountInto(parent, For, {
      each: range(1),
      children: () => [
        mountElement("p", { children: "partial" }, new Scope()),
        () => { throw new Error("nested"); },
      ],
    });
    expect(parent.textContent).toBe("");
    expect(parent.childNodes).toHaveLength(3);
  });

  it("removes only the failed row's partial nodes when rows before it are in the same batch", () => {
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation(() => undefined);
    const parent = document.createElement("div");
    mountInto(parent, For, {
      each: range(2),
      children: (item: () => Item) => item().id === 0
        ? mountElement("p", { children: "ok" }, new Scope())
        : [mountElement("p", { children: "partial" }, new Scope()), () => { throw new Error("nested"); }],
    });
    expect(parent.textContent).toBe("ok");
  });

  it("dispose errors are collected: one error as is, several as AggregateError", () => {
    const list = signal(range(3));
    const { text } = setup({
      each: list,
      by: "id",
      children: (item: () => Item) => {
        getCurrentScope().add(() => { throw new Error(`dispose ${String(item().id)}`); });
        return rowOf(item);
      },
    });
    expect(() => { list.set(items(0, 2)); }).toThrow("dispose 1");
    expect(text()).toBe("0,2");
    let error: unknown;
    try { list.set([]); } catch (e) { error = e; }
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toHaveLength(2);
    expect(text()).toBe("");
  });

  it("disposing the list rethrows row dispose errors", () => {
    const { scope } = setup({
      each: range(1),
      children: (item: () => Item) => {
        getCurrentScope().add(() => { throw new Error("bye"); });
        return rowOf(item);
      },
    });
    expect(() => { scope.dispose(); }).toThrow("bye");
  });

  it("an error from `by` or `each` on the first pass is reported, and later ones throw", () => {
    const reported: unknown[] = [];
    vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => {
      try { cb(); } catch (e) { reported.push(e); }
    });
    const list = signal(range(2));
    let fail = true;
    const { text } = setup({
      each: list,
      by: (item: Item) => {
        if (fail) throw new Error("key");
        return item.id;
      },
      children: rowOf,
    });
    expect(reported).toHaveLength(1);
    expect(text()).toBe("");
    fail = false;
    list.set(range(2));
    expect(text()).toBe("0,1");
    fail = true;
    expect(() => { list.set(range(3)); }).toThrow("key");
    expect(text()).toBe("0,1");
  });
});

// ── misc ─────────────────────────────────────────────────────────────────────

describe("For — misc", () => {
  it("logs and renders nothing without a function child", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { parent } = setup({ each: range(2), children: "nope" });
    expect(parent.children).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("<For> expects a function child"));
    const prev = env.NODE_ENV;
    env.NODE_ENV = "production";
    error.mockClear();
    try { setup({ each: range(2) }, Index); } finally { env.NODE_ENV = prev; }
    expect(error).not.toHaveBeenCalled();
  });

  it("takes the function out of an array of children", () => {
    const { text } = setup({ each: range(2), children: [" ", rowOf] });
    expect(text()).toBe("0,1");
  });

  it("brings its own boundaries when rendered outside mountComponent", () => {
    const scope = new Scope();
    const list = signal(range(2));
    const parent = document.createElement("div");
    runInScope(scope, () => {
      const instance = new For({ each: list, by: "id", children: rowOf });
      parent.appendChild(instance.render() as Node);
    });
    expect(parent.childNodes).toHaveLength(4);
    list.set([]);
    expect(parent.childNodes).toHaveLength(2);
    list.set(range(1));
    expect(parent.textContent).toBe("0");
  });

  it("skips updates while its end marker is detached", () => {
    const list = signal(range(2));
    const { parent } = setup({ each: list, by: "id", children: rowOf });
    const end = parent.lastChild as Node;
    parent.removeChild(end);
    list.set(range(5));
    expect(parent.children).toHaveLength(2);
  });

  it("uses moveBefore on a connected parent and insertBefore on a detached one", () => {
    const list = signal(range(3));
    const { parent } = setup({ each: list, by: "id", children: rowOf });
    const moveBefore = vi.fn(function (this: Node, node: Node, ref: Node | null) { this.insertBefore(node, ref); });
    (parent as unknown as { moveBefore: typeof moveBefore }).moveBefore = moveBefore;
    list.set(items(2, 1, 0));
    expect(moveBefore).toHaveBeenCalled();
    expect(Array.from(parent.children).map((c) => c.textContent).join(",")).toBe("2,1,0");

    const detached = document.createElement("div");
    const moveDetached = vi.fn();
    (detached as unknown as { moveBefore: typeof moveDetached }).moveBefore = moveDetached;
    const other = signal(range(3));
    mountInto(detached, For, { each: other, by: "id", children: rowOf });
    other.set(items(2, 1, 0));
    expect(moveDetached).not.toHaveBeenCalled();
    expect(detached.textContent).toBe("210");
  });
});

// ── Index ────────────────────────────────────────────────────────────────────

describe("Index", () => {
  it("keeps rows by position and updates item() in place", () => {
    const tags = signal(["a", "b", "a"]);
    const render = vi.fn((tag: () => string, i: number) =>
      mountElement("tr", { children: () => `${String(i)}:${tag()}` }, new Scope()),
    );
    const { text, rows } = setup({ each: tags, children: render }, Index);
    const first = rows()[0];
    tags.set(["c", "b", "a"]);
    expect(text()).toBe("0:c,1:b,2:a");
    expect(rows()[0]).toBe(first);
    expect(render).toHaveBeenCalledTimes(3);
    tags.set(["c", "b", "a", "d", "e"]);
    expect(text()).toBe("0:c,1:b,2:a,3:d,4:e");
    tags.set(["z"]);
    expect(text()).toBe("0:z");
    expect(rows()[0]).toBe(first);
    tags.set(["z", "y"]);
    expect(text()).toBe("0:z,1:y");
  });

  it("clears, shows its fallback and grows from empty", () => {
    const tags = signal(["a"]);
    const fallback = mountElement("tr", { children: "none" }, new Scope());
    const { text } = setup({ each: tags, fallback, children: (tag: () => string) => mountElement("tr", { children: tag() }, new Scope()) }, Index);
    tags.set([]);
    expect(text()).toBe("none");
    tags.set(["x", "y"]);
    expect(text()).toBe("x,y");
  });

  it("stays empty when an empty list is set again", () => {
    const tags = signal<string[]>([]);
    const { parent } = setup({ each: tags, children: () => document.createElement("tr") }, Index);
    tags.set([]);
    expect(parent.childNodes).toHaveLength(2);
  });

  it("does not warn about duplicate values", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    setup({ each: ["a", "a"], children: () => document.createElement("tr") }, Index);
    expect(warn).not.toHaveBeenCalled();
  });

  it("leaves trailing rows with a transition", async () => {
    const { transition, leaves } = fakeTransition();
    const tags = signal(["a", "b", "c"]);
    const { text } = setup({ each: tags, transition, children: (tag: () => string) => mountElement("tr", { children: tag() }, new Scope()) }, Index);
    tags.set(["a"]);
    expect(text()).toBe("a,b,c");
    leaves.get("b")?.resolve();
    leaves.get("c")?.resolve();
    await flush();
    expect(text()).toBe("a");
  });
});

describe("For and Index — random updates", () => {
  // Deterministic: every round mixes removals, insertions, moves, empty lists and long ones.
  function randomLists(rounds: number, seed: number): number[][] {
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const lists: number[][] = [];
    let next = 0;
    let current: number[] = [];
    for (let round = 0; round < rounds; round++) {
      const roll = random();
      if (roll < 0.08) current = [];
      else if (roll < 0.16) current = Array.from({ length: 40 + Math.floor(random() * 40) }, () => next++);
      else {
        const kept = current.filter(() => random() > 0.25);
        for (let i = kept.length - 1; i > 0; i--) {
          if (random() < 0.3) {
            const j = Math.floor(random() * (i + 1));
            [kept[i], kept[j]] = [kept[j], kept[i]];
          }
        }
        const added = Math.floor(random() * 6);
        for (let i = 0; i < added; i++) kept.splice(Math.floor(random() * (kept.length + 1)), 0, next++);
        current = kept;
      }
      lists.push(current);
    }
    return lists;
  }

  for (const [label, siblings] of [["owning its parent", false], ["between other nodes", true]] as const) {
    it(`For keeps every row in order and reuses the rows of kept keys, ${label}`, () => {
      const ids = signal<Item[]>([]);
      const parent = document.createElement("tbody");
      document.body.appendChild(parent);
      if (siblings) parent.appendChild(document.createElement("caption"));
      const scope = new Scope();
      runInScope(scope, () => {
        for (const node of mountComponent(For as never, { each: ids, by: "id", fallback: "empty", children: rowOf }, scope)) parent.appendChild(node);
      });
      if (siblings) parent.appendChild(document.createElement("tfoot"));
      const rowsByKey = new Map<string, Element>();
      for (const list of randomLists(120, 7)) {
        ids.set(list.map((id) => ({ id })));
        const rows = Array.from(parent.querySelectorAll("tr"));
        expect(rows.map((r) => r.textContent)).toEqual(list.map(String));
        expect(parent.textContent).toContain(list.length === 0 ? "empty" : "");
        for (const row of rows) {
          const key = row.textContent as string;
          const known = rowsByKey.get(key);
          if (known !== undefined) expect(row).toBe(known);
          rowsByKey.set(key, row);
        }
        if (siblings) {
          expect(parent.firstChild?.nodeName).toBe("CAPTION");
          expect(parent.lastChild?.nodeName).toBe("TFOOT");
        }
      }
      scope.dispose();
      parent.remove();
    });
  }

  it("Index keeps one row per position and shows each item's current value", () => {
    const values = signal<number[]>([]);
    const { rows, text, scope, parent } = setup({
      each: values,
      children: (value: () => number) => mountElement("tr", { children: () => String(value()) }, getCurrentScope()),
    }, Index);
    let previous: HTMLElement[] = [];
    for (const list of randomLists(80, 11)) {
      values.set(list);
      expect(text()).toBe(list.join(","));
      const current = rows();
      for (let i = 0; i < Math.min(previous.length, current.length); i++) expect(current[i]).toBe(previous[i]);
      previous = current;
    }
    scope.dispose();
    parent.remove();
  });
});

// ── LIS ──────────────────────────────────────────────────────────────────────

describe("longestIncreasingSubsequence", () => {
  it("returns the positions of a longest increasing run, ignoring zeros", () => {
    expect(Array.from(longestIncreasingSubsequence(Int32Array.from([3, 1, 2, 0, 5, 4])))).toEqual([1, 2, 5]);
    expect(Array.from(longestIncreasingSubsequence(Int32Array.from([0, 0])))).toEqual([]);
    expect(Array.from(longestIncreasingSubsequence(Int32Array.from([5, 4, 3])))).toEqual([2]);
    expect(Array.from(longestIncreasingSubsequence(new Int32Array(0)))).toEqual([]);
  });

  it("matches a reference LIS length on random input", () => {
    let seed = 3;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let round = 0; round < 50; round++) {
      const values = Array.from({ length: 40 }, () => Math.floor(random() * 30));
      const result = Array.from(longestIncreasingSubsequence(Int32Array.from(values)));
      expect(result.length).toBe(lisLength(values.filter((v) => v !== 0)));
      for (let i = 1; i < result.length; i++) expect(values[result[i]]).toBeGreaterThan(values[result[i - 1]]);
    }
  });
});
