import {
  RootComponent,
  batch,
  getComponentProps,
  setComponentAnchor,
  setComponentStart,
  signal,
  untrack,
} from "@praxisjs/core/internal";
import type { Children, Signal } from "@praxisjs/shared";

import { mountChildren } from "./children";
import { getCurrentScope, swapScope } from "./context";
import { moveRange, removeRange } from "./dom/range";
import { recording, onHydrationReplace } from "./hydration-context";
import { Scope } from "./scope";

declare const process: { env: { NODE_ENV?: string } };

/** Anything with Promise-based `enter`/`leave` hooks, such as `createTransition()` from `@praxisjs/motion`. */
export interface ListTransition {
  enter?(el: HTMLElement): Promise<void>;
  leave?(el: HTMLElement): Promise<void>;
}

export type ListSource<T> =
  | readonly T[]
  | Iterable<T>
  | null
  | undefined
  | (() => readonly T[] | Iterable<T> | null | undefined);

export interface ForProps<T> {
  /** The items, or a function returning them. Only this function is tracked by the list. */
  each: ListSource<T>;
  /**
   * Identifies an item across updates: a function of the item (and its index), or the name of a
   * property holding the key. Defaults to the item itself.
   */
  by?: ((item: T, index: number) => unknown) | keyof T;
  /** Rendered while the list is empty. A function is mounted (and disposed) each time it shows. */
  fallback?: Children;
  /** Runs `enter` on the elements of added rows and keeps removed rows until `leave` resolves. */
  transition?: ListTransition;
  /** Also run `transition.enter` for the rows of the first render. */
  appear?: boolean;
  /**
   * Renders one row, once per key. `item()` returns the current item for that key and is reactive
   * when read inside a binding; `index()` returns the row's current position.
   */
  children: (item: () => T, index: () => number) => Children;
}

export interface IndexProps<T> {
  each: ListSource<T>;
  fallback?: Children;
  transition?: ListTransition;
  appear?: boolean;
  /** Renders the row at one position. `item()` is reactive and follows whatever sits at `index`. */
  children: (item: () => T, index: number) => Children;
}

type RowRender<T> = (item: () => T, index: (() => number) | number) => unknown;

// A row is its own scope: one allocation per row instead of two, which shows up when thousands of
// rows are created at once. `first` and `last` are assigned once the row is built, always in that
// order: the other order would put rows on a second hidden class and make the code reading them
// polymorphic.
class Row<T> extends Scope {
  declare first: Node;
  declare last: Node;
  declare itemSignal: Signal<T> | null;
  declare indexSignal: Signal<number> | null;
  declare key: unknown;
  declare item: T;
  declare index: number;

  constructor(key: unknown, item: T, index: number) {
    super();
    this.key = key;
    this.item = item;
    this.index = index;
    this.itemSignal = null;
    this.indexSignal = null;
  }
}

// Keeps the row shape (fields included) alive across full GCs; see the keeper in scope.ts.
const rowKeeper = new Row<unknown>(null, undefined, 0);
rowKeeper.first = null as unknown as Node;
rowKeeper.last = null as unknown as Node;
Object.defineProperty(Row, "shapeKeeper", { value: rowKeeper });

const NO_ROWS: never[] = [];

const DETACHED_FILL_MIN = 64;

// Plain containers only: removing a dialog, a popover, media, a form control or a custom element from
// the document, even for a moment, has visible side effects (closing, stopping, lifecycle callbacks).
const DETACHABLE = new Set([
  "tbody", "thead", "tfoot", "table", "tr", "ul", "ol", "dl", "div", "section", "article", "main",
  "nav", "aside", "header", "footer", "span", "p", "colgroup", "fieldset", "figure", "menu",
]);

function canDetach(parent: Node, start: Node, end: Node): boolean {
  if (parent.firstChild !== start || start.nextSibling !== end || parent.lastChild !== end) return false;
  const el = parent as Element;
  if (el.nodeType !== 1 || !el.isConnected || !DETACHABLE.has(el.localName)) return false;
  if (el.hasAttribute("popover") || document.fullscreenElement === el) return false;
  if (el.contains(document.activeElement)) return false;
  // Re-inserting an element restarts its CSS animations. Not every DOM implementation has the API.
  const { getAnimations } = el as Partial<Pick<Element, "getAnimations">>;
  return getAnimations === undefined || el.getAnimations().length === 0;
}


function toArray<T>(value: readonly T[] | Iterable<T> | null | undefined): readonly T[] {
  if (value === null || value === undefined) return NO_ROWS;
  if (Array.isArray(value)) return value as readonly T[];
  return Array.from(value);
}

// A row needs a start marker only when its first node can change: a top-level reactive child
// inserts its nodes before its own end comment, so whatever comes first may later be replaced.
// null means the value renders nothing.
function leadsWithReactive(value: unknown): boolean | null {
  if (typeof value === "function") return true;
  if (Array.isArray(value)) {
    for (const v of value) {
      const leads = leadsWithReactive(v);
      if (leads !== null) return leads;
    }
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || value instanceof Node) return false;
  return null;
}

function describeKey(key: unknown): string {
  if (typeof key === "string") return JSON.stringify(key);
  if (typeof key === "object" && key !== null) return Object.prototype.toString.call(key);
  return String(key as number | boolean | symbol | null | undefined);
}

function warnDuplicates(keys: readonly unknown[], owner: string): void {
  const seen = new Set<unknown>();
  const duplicates = new Set<unknown>();
  for (const key of keys) {
    if (seen.has(key)) duplicates.add(key);
    else seen.add(key);
  }
  for (const key of duplicates) {
    console.warn(
      `[PraxisJS] <${owner}> received the key ${describeKey(key)} more than once. Keys must be unique: ` +
        "the first occurrence keeps its row, later ones get a new row on every update.",
    );
  }
}

/**
 * Longest increasing subsequence of `sources`, ignoring zeros (rows without a previous position).
 * Returns the positions in `sources` that belong to it, in increasing order. O(n log n).
 */
export function longestIncreasingSubsequence(sources: Int32Array): Int32Array {
  const n = sources.length;
  const predecessors = new Int32Array(n);
  const tails = new Int32Array(n);
  let length = 0;
  for (let i = 0; i < n; i++) {
    const value = sources[i];
    if (value === 0) continue;
    if (length > 0 && sources[tails[length - 1]] < value) {
      predecessors[i] = tails[length - 1];
      tails[length++] = i;
      continue;
    }
    let lo = 0;
    let hi = length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sources[tails[mid]] < value) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) predecessors[i] = tails[lo - 1];
    tails[lo] = i;
    if (lo === length) length++;
  }
  const result = new Int32Array(length);
  let k = length > 0 ? tails[length - 1] : 0;
  for (let i = length - 1; i >= 0; i--) {
    result[i] = k;
    k = predecessors[k];
  }
  return result;
}

function sameKeys(rows: ReadonlyArray<{ key: unknown }>, from: number, keys: readonly unknown[], to: number, count: number): boolean {
  for (let t = 0; t < count; t++) {
    if (rows[from + t].key !== keys[to + t]) return false;
  }
  return true;
}

function elementsOf(row: { first: Node; last: Node }): HTMLElement[] {
  const elements: HTMLElement[] = [];
  let node: Node | null = row.first;
  while (node !== null) {
    if (node.nodeType === 1) elements.push(node as HTMLElement);
    if (node === row.last) break;
    node = node.nextSibling;
  }
  return elements;
}

// The hooks are always called as methods of the transition object, so class-based transitions keep
// their `this`.
function canEnter(transition: ListTransition | undefined): transition is Required<Pick<ListTransition, "enter">> {
  return transition?.enter !== undefined;
}

function canLeave(transition: ListTransition | undefined): transition is Required<Pick<ListTransition, "leave">> {
  return transition?.leave !== undefined;
}

function reportLater(error: unknown): void {
  queueMicrotask(() => { throw error; });
}

// A module function rather than a method: bundles without hydration drop it along with the rest.
function trackHydration(row: { first: Node; last: Node }, fresh: Node): void {
  onHydrationReplace(fresh, (real) => {
    if (row.first === fresh) row.first = real;
    if (row.last === fresh) row.last = real;
  });
}

interface ListOptions<T> {
  owner: string;
  render: RowRender<T>;
  key: ((item: T, index: number) => unknown) | null;
  /** Index's update, passed in rather than called from ListView so that bundles without Index leave it out. */
  positional: ((view: ListView<T>, parent: Node, items: readonly T[]) => void) | null;
  fallback: unknown;
  transition: ListTransition | undefined;
  appear: boolean;
}

// Members used only inside the class are #private: minifiers shorten their names, which they cannot
// do for public ones, and this class is most of the list code a bundle ships.
class ListView<T> {
  rows: Array<Row<T>>;
  readonly end: Comment;
  readonly #start: Comment;
  readonly #options: ListOptions<T>;
  // Created by the first leave transition.
  #leaving: Set<Row<T>> | null;
  #fallbackRow: Row<undefined> | null;
  #errors: unknown[];
  #entering: Array<Row<T>> | null;
  #initial: boolean;
  readonly #scratch: DocumentFragment;
  readonly #passIndex: boolean;
  readonly #itemChanges: boolean;

  constructor(start: Comment, end: Comment, options: ListOptions<T>) {
    this.rows = NO_ROWS;
    this.end = end;
    this.#start = start;
    this.#options = options;
    this.#leaving = null;
    this.#fallbackRow = null;
    this.#errors = [];
    this.#entering = null;
    this.#initial = true;
    this.#scratch = document.createDocumentFragment();
    this.#passIndex = options.render.length !== 1;
    this.#itemChanges = options.key !== null || options.positional !== null;
  }

  update(items: readonly T[]): void {
    const parent = this.end.parentNode;
    if (parent === null) return;
    const { positional } = this.#options;
    if (positional !== null) positional(this, parent, items);
    else this.#updateKeyed(parent, items);
    this.#finish();
  }

  // ── keyed ──────────────────────────────────────────────────────────────────

  #updateKeyed(parent: Node, items: readonly T[]): void {
    const keyOf = this.#options.key;
    const oldRows = this.rows;
    const oldLen = oldRows.length;
    const newLen = items.length;

    let keys: readonly unknown[] = items;
    if (keyOf !== null) {
      const computed = new Array<unknown>(newLen);
      for (let i = 0; i < newLen; i++) computed[i] = keyOf(items[i], i);
      keys = computed;
    }
    // Written inline so bundlers fold `process.env.NODE_ENV` and drop the check from production
    // builds. Without a bundler `process` is undefined and the try keeps that from throwing.
    try {
      if (process.env.NODE_ENV !== "production") warnDuplicates(keys, this.#options.owner);
    } catch {
      // no `process`: no dev warnings
    }

    if (newLen === 0) {
      if (oldLen > 0) this.removeAll(parent);
      this.rows = NO_ROWS;
      this.showFallback(parent);
      return;
    }

    const newRows = new Array<Row<T>>(newLen);

    if (oldLen === 0) {
      this.hideFallback(parent);
      this.insertNew(parent, items, keys, newRows, 0, newLen - 1, this.end);
      this.rows = newRows;
      return;
    }

    let aStart = 0;
    let bStart = 0;
    let aEnd = oldLen - 1;
    let bEnd = newLen - 1;

    while (aStart <= aEnd && bStart <= bEnd) {
      const row = oldRows[aStart];
      if (row.key !== keys[bStart]) break;
      this.updateRow(row, items[bStart], bStart);
      newRows[bStart++] = row;
      aStart++;
    }
    while (aStart <= aEnd && bStart <= bEnd) {
      const row = oldRows[aEnd];
      if (row.key !== keys[bEnd]) break;
      this.updateRow(row, items[bEnd], bEnd);
      newRows[bEnd--] = row;
      aEnd--;
    }

    if (aStart > aEnd) {
      if (bStart <= bEnd) {
        const ref = bEnd + 1 < newLen ? newRows[bEnd + 1].first : this.end;
        this.insertNew(parent, items, keys, newRows, bStart, bEnd, ref);
      }
    } else if (bStart > bEnd) {
      this.removeSpan(parent, oldRows, aStart, aEnd);
    } else if (!this.#moveOneOrSwap(parent, oldRows, items, keys, newRows, aStart, aEnd, bStart, bEnd)) {
      this.#reconcileMiddle(parent, oldRows, items, keys, newRows, aStart, aEnd, bStart, bEnd);
    }

    this.rows = newRows;
  }

  // After trimming, the most common reorderings (one row moved anywhere, two rows swapped) leave
  // ranges that differ only at their ends. Recognising them needs key comparisons only: no Map,
  // no LIS, and the result is already the minimum number of moves.
  #moveOneOrSwap(
    parent: Node,
    oldRows: Array<Row<T>>,
    items: readonly T[],
    keys: readonly unknown[],
    newRows: Array<Row<T>>,
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ): boolean {
    const span = aEnd - aStart;
    if (span !== bEnd - bStart || span < 1) return false;
    const head = oldRows[aStart];
    const tail = oldRows[aEnd];
    const ref = bEnd + 1 < newRows.length ? newRows[bEnd + 1].first : this.end;

    if (head.key === keys[bEnd] && sameKeys(oldRows, aStart + 1, keys, bStart, span)) {
      for (let t = 0; t < span; t++) this.#keep(oldRows[aStart + 1 + t], items, newRows, bStart + t);
      this.#keep(head, items, newRows, bEnd);
      moveRange(parent, head.first, head.last, ref);
      return true;
    }
    if (tail.key === keys[bStart] && sameKeys(oldRows, aStart, keys, bStart + 1, span)) {
      for (let t = 0; t < span; t++) this.#keep(oldRows[aStart + t], items, newRows, bStart + 1 + t);
      this.#keep(tail, items, newRows, bStart);
      moveRange(parent, tail.first, tail.last, head.first);
      return true;
    }
    if (
      span > 1 &&
      head.key === keys[bEnd] &&
      tail.key === keys[bStart] &&
      sameKeys(oldRows, aStart + 1, keys, bStart + 1, span - 1)
    ) {
      for (let t = 1; t < span; t++) this.#keep(oldRows[aStart + t], items, newRows, bStart + t);
      this.#keep(head, items, newRows, bEnd);
      this.#keep(tail, items, newRows, bStart);
      moveRange(parent, tail.first, tail.last, head.first);
      moveRange(parent, head.first, head.last, ref);
      return true;
    }
    return false;
  }

  #keep(row: Row<T>, items: readonly T[], newRows: Array<Row<T>>, index: number): void {
    this.updateRow(row, items[index], index);
    newRows[index] = row;
  }

  // Vue 3 / ivi / Inferno strategy: key → new position map, each surviving row records its old
  // position, and the rows on the longest increasing subsequence of those positions stay put.
  // Everything else moves once, which is the minimum for arbitrary reorders.
  #reconcileMiddle(
    parent: Node,
    oldRows: Array<Row<T>>,
    items: readonly T[],
    keys: readonly unknown[],
    newRows: Array<Row<T>>,
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number,
  ): void {
    const newLen = newRows.length;
    const count = bEnd - bStart + 1;
    const keyToIndex = new Map<unknown, number>();
    // Walking backwards leaves the first occurrence of a duplicate key in the map.
    for (let j = bEnd; j >= bStart; j--) keyToIndex.set(keys[j], j);

    const sources = new Int32Array(count);
    const kept = new Uint8Array(aEnd - aStart + 1);
    let moved = false;
    let maxSoFar = 0;
    let reused = 0;
    for (let i = aStart; i <= aEnd; i++) {
      const row = oldRows[i];
      const j = keyToIndex.get(row.key);
      if (j === undefined || sources[j - bStart] !== 0) continue;
      sources[j - bStart] = i + 1;
      kept[i - aStart] = 1;
      this.#keep(row, items, newRows, j);
      reused++;
      if (j < maxSoFar) moved = true;
      else maxSoFar = j;
    }

    const ref = bEnd + 1 < newLen ? newRows[bEnd + 1].first : this.end;

    if (reused === 0) {
      if (aStart === 0 && aEnd === oldRows.length - 1) this.removeAll(parent);
      else this.removeSpan(parent, oldRows, aStart, aEnd);
      this.insertNew(parent, items, keys, newRows, bStart, bEnd, ref);
      return;
    }

    for (let i = aStart; i <= aEnd; i++) {
      if (kept[i - aStart] === 0) this.#removeRow(parent, oldRows[i]);
    }

    const stable = moved ? longestIncreasingSubsequence(sources) : null;
    let s = stable === null ? -1 : stable.length - 1;
    for (let k = count - 1; k >= 0; k--) {
      const j = bStart + k;
      const before = j + 1 < newLen ? newRows[j + 1].first : ref;
      if (sources[k] === 0) {
        newRows[j] = this.#insertRow(parent, items[j], keys[j], j, before);
      } else if (stable !== null) {
        if (s >= 0 && stable[s] === k) {
          s--;
        } else {
          const row = newRows[j];
          moveRange(parent, row.first, row.last, before);
        }
      }
    }
  }

  // ── rows ───────────────────────────────────────────────────────────────────

  updateRow(row: Row<T>, item: T, index: number): void {
    if (row.item !== item) {
      row.item = item;
      row.itemSignal?.set(item);
    }
    if (row.index !== index) {
      row.index = index;
      row.indexSignal?.set(index);
    }
  }

  #createRow(item: T, key: unknown, index: number, container: Node): Row<T> {
    const row = new Row(key, item, index);
    const itemAccessor = this.#itemChanges
      ? () => (row.itemSignal ??= signal(row.item))()
      : () => row.item;
    let indexArg: (() => number) | number = index;
    if (this.#options.positional === null && this.#passIndex) {
      indexArg = () => (row.indexSignal ??= signal(row.index))();
    }
    this.#mount(row, container, this.#options.render, itemAccessor, indexArg);
    if (this.#entering !== null) this.#entering.push(row);
    return row;
  }

  #mount<R, A, B>(row: Row<R>, container: Node, build: (a: A, b: B) => unknown, a: A, b: B): void {
    // The container's last node before this row's, read once the row is built (building it never
    // touches the container) and only when the row is more than one node. Undefined until then.
    let before: ChildNode | null | undefined = undefined;
    const prevScope = swapScope(row);
    try {
      const value = build(a, b);
      if (value instanceof Node && value.nodeType !== 11) {
        container.appendChild(value);
        row.first = value;
        row.last = value;
        if (recording && value.nodeType === 1) trackHydration(row, value);
        return;
      }
      before = container.lastChild;
      if (leadsWithReactive(value) === true) container.appendChild(document.createComment(""));
      mountChildren(container, value, row);
    } catch (error) {
      this.#errors.push(error);
      this.#disposeRow(row);
      if (before !== undefined) {
        let node = before === null ? container.firstChild : before.nextSibling;
        while (node !== null) {
          const next = node.nextSibling;
          container.removeChild(node);
          node = next;
        }
      } else {
        before = container.lastChild;
      }
      // A unique key never matches again, so the next update renders this item from scratch.
      row.key = {};
    } finally {
      swapScope(prevScope);
    }

    const first = before === null ? container.firstChild : before.nextSibling;
    if (first === null) {
      const placeholder = document.createComment("");
      container.appendChild(placeholder);
      row.first = placeholder;
      row.last = placeholder;
      return;
    }
    row.first = first;
    row.last = container.lastChild as Node;

    if (recording) {
      if (row.first.nodeType === 1) trackHydration(row, row.first);
      if (row.last !== row.first && row.last.nodeType === 1) trackHydration(row, row.last);
    }
  }

  #insertRow(parent: Node, item: T, key: unknown, index: number, ref: Node): Row<T> {
    const scratch = this.#scratch;
    const row = this.#createRow(item, key, index, scratch);
    parent.insertBefore(row.first === row.last ? row.first : scratch, ref);
    return row;
  }

  insertNew(
    parent: Node,
    items: readonly T[],
    keys: readonly unknown[],
    newRows: Array<Row<T>>,
    from: number,
    to: number,
    ref: Node,
  ): void {
    if (from === to) {
      newRows[from] = this.#insertRow(parent, items[from], keys[from], from, ref);
      return;
    }
    // Building rows straight into a parent that is attached to the document makes every insertion
    // pay for the live tree, so they go into a detached fragment first. When the list was empty and
    // owns all of its parent, filling the parent while it is briefly detached is cheaper still: no
    // node has to move out of a fragment afterwards.
    const owner = parent.parentNode;
    if (to - from + 1 >= DETACHED_FILL_MIN && ref === this.end && owner !== null && canDetach(parent, this.#start, this.end)) {
      const next = parent.nextSibling;
      owner.removeChild(parent);
      parent.removeChild(this.end);
      try {
        for (let j = from; j <= to; j++) newRows[j] = this.#createRow(items[j], keys[j], j, parent);
      } finally {
        parent.appendChild(this.end);
        owner.insertBefore(parent, next);
      }
      return;
    }
    const fragment = document.createDocumentFragment();
    for (let j = from; j <= to; j++) newRows[j] = this.#createRow(items[j], keys[j], j, fragment);
    parent.insertBefore(fragment, ref);
  }

  #disposeRow(row: Scope): void {
    try {
      row.dispose();
    } catch (error) {
      this.#errors.push(error);
    }
  }

  #removeRow(parent: Node, row: Row<T>): void {
    const { transition } = this.#options;
    if (canLeave(transition)) {
      this.#leave(row, transition);
      return;
    }
    this.#disposeRow(row);
    removeRange(parent, row.first, row.last);
  }

  // Rows in [from, to] are contiguous in the DOM unless some are still leaving, so without a leave
  // transition one walk from the first boundary to the last removes them all.
  removeSpan(parent: Node, rows: Array<Row<T>>, from: number, to: number): void {
    if (canLeave(this.#options.transition)) {
      for (let i = from; i <= to; i++) this.#removeRow(parent, rows[i]);
      return;
    }
    for (let i = from; i <= to; i++) this.#disposeRow(rows[i]);
    removeRange(parent, rows[from].first, rows[to].last);
  }

  removeAll(parent: Node): void {
    const rows = this.rows;
    if (canLeave(this.#options.transition) || parent.firstChild !== this.#start || parent.lastChild !== this.end) {
      this.removeSpan(parent, rows, 0, rows.length - 1);
      return;
    }
    // The list owns every child of its parent: clearing it in one call is far cheaper than removing
    // rows one by one, then the two boundary comments go back in.
    for (const row of rows) this.#disposeRow(row);
    parent.textContent = "";
    parent.appendChild(this.#start);
    parent.appendChild(this.end);
  }

  #leave(row: Row<T>, transition: Required<Pick<ListTransition, "leave">>): void {
    const leaving = (this.#leaving ??= new Set());
    leaving.add(row);
    const done = () => {
      if (!leaving.delete(row)) return;
      this.#disposeRow(row);
      const parent = row.first.parentNode;
      if (parent !== null) removeRange(parent, row.first, row.last);
      this.flushErrors(reportLater);
    };
    let pending: Promise<unknown>;
    try {
      pending = Promise.all(elementsOf(row).map((el) => transition.leave(el)));
    } catch (error) {
      pending = Promise.reject(error as Error);
    }
    pending.then(done, (error: unknown) => {
      done();
      reportLater(error);
    });
  }

  // ── fallback ───────────────────────────────────────────────────────────────

  showFallback(parent: Node): void {
    const { fallback } = this.#options;
    if (fallback === undefined || fallback === null || this.#fallbackRow !== null) return;
    const row = new Row(null, undefined, 0);
    this.#mount(row, this.#scratch, () => fallback, null, null);
    parent.insertBefore(row.first === row.last ? row.first : this.#scratch, this.end);
    this.#fallbackRow = row;
  }

  hideFallback(parent: Node): void {
    const row = this.#fallbackRow;
    if (row === null) return;
    this.#fallbackRow = null;
    this.#disposeRow(row);
    removeRange(parent, row.first, row.last);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  beginPass(): void {
    const { transition, appear } = this.#options;
    if (canEnter(transition) && (!this.#initial || appear)) this.#entering = [];
  }

  #finish(): void {
    this.#initial = false;
    const entering = this.#entering;
    const { transition } = this.#options;
    this.#entering = null;
    if (entering !== null && canEnter(transition)) {
      for (const row of entering) {
        for (const el of elementsOf(row)) {
          try {
            transition.enter(el).catch(reportLater);
          } catch (error) {
            reportLater(error);
          }
        }
      }
    }
  }

  flushErrors(report: (error: unknown) => void): void {
    const errors = this.#errors;
    if (errors.length === 0) return;
    this.#errors = [];
    report(errors.length === 1 ? errors[0] : new AggregateError(errors, `[PraxisJS] Multiple errors while updating <${this.#options.owner}>`));
  }

  dispose(): void {
    for (const row of this.rows) this.#disposeRow(row);
    const leaving = this.#leaving;
    if (leaving !== null) {
      for (const row of leaving) this.#disposeRow(row);
      leaving.clear();
    }
    this.rows = NO_ROWS;
    if (this.#fallbackRow !== null) this.#disposeRow(this.#fallbackRow);
    this.#fallbackRow = null;
    this.flushErrors((error) => { throw error; });
  }
}

// ── positional (Index) ─────────────────────────────────────────────────────

function updatePositional<T>(view: ListView<T>, parent: Node, items: readonly T[]): void {
  const oldRows = view.rows;
  const oldLen = oldRows.length;
  const newLen = items.length;

  if (newLen === 0) {
    if (oldLen > 0) view.removeAll(parent);
    view.rows = NO_ROWS;
    view.showFallback(parent);
    return;
  }
  if (oldLen === 0) view.hideFallback(parent);

  const common = Math.min(oldLen, newLen);
  for (let i = 0; i < common; i++) view.updateRow(oldRows[i], items[i], i);

  if (newLen === oldLen) return;
  const newRows = oldRows.slice(0, common);
  if (newLen > oldLen) {
    newRows.length = newLen;
    view.insertNew(parent, items, items, newRows, oldLen, newLen - 1, view.end);
  } else {
    view.removeSpan(parent, oldRows, newLen, oldLen - 1);
  }
  view.rows = newRows;
}

function resolveRender<T>(children: unknown, owner: string): RowRender<T> | null {
  const candidate = Array.isArray(children) ? (children as unknown[]).find((c) => typeof c === "function") : children;
  if (typeof candidate === "function") return candidate as RowRender<T>;
  try {
    if (process.env.NODE_ENV !== "production") console.error(`[PraxisJS] <${owner}> expects a function child that renders one row.`);
  } catch {
    // no `process`: no dev warnings
  }
  return null;
}

function resolveKey<T>(by: ForProps<T>["by"]): ((item: T, index: number) => unknown) | null {
  if (by === undefined) return null;
  if (typeof by === "function") return by;
  return (item: T) => (item as Record<PropertyKey, unknown>)[by];
}

function mountList<T>(
  instance: object,
  each: ListSource<T>,
  options: ListOptions<T>,
): Node {
  const scope = getCurrentScope();
  const start = document.createComment("");
  const end = document.createComment("");
  // The list's boundaries are its component's too, so mountComponent adds no comments of its own.
  setComponentStart(instance, start);
  setComponentAnchor(instance, end);

  // The first update runs before mountComponent attaches anything, so the rows are built in front
  // of `end` inside this fragment, which is what render() returns.
  const fragment = document.createDocumentFragment();
  fragment.appendChild(start);
  fragment.appendChild(end);

  const view = new ListView(start, end, options);
  const run = () => {
    const items = toArray(typeof each === "function" ? each() : each);
    untrack(() => {
      view.beginPass();
      batch(() => { view.update(items); });
    });
  };
  let initial = true;
  scope.effect(() => {
    if (!initial) {
      run();
      view.flushErrors((error) => { throw error; });
      return;
    }
    initial = false;
    // A throw here would escape scope.effect() before the effect is registered for disposal, and
    // mountComponent swallows render() errors unless the component defines onError, so the first
    // pass reports asynchronously instead.
    try {
      run();
    } catch (error) {
      reportLater(error);
    }
    view.flushErrors(reportLater);
  });
  scope.add(() => { view.dispose(); });
  return fragment;
}

/**
 * Keyed list. Rows are created once per key and kept (with their DOM, state and effects) while the
 * key stays in the list; reorders move the existing nodes with the minimum number of moves.
 *
 * @example
 * <For each={() => this.todos} by={(todo) => todo.id} fallback={<p>Nothing to do</p>}>
 *   {(todo, index) => <li>{() => `${index() + 1}. ${todo().title}`}</li>}
 * </For>
 */
export class For<T> extends RootComponent<ForProps<T>> {
  static readonly __isComponent = true as const;
  static readonly __isStateless = true;
  static readonly __jsxRawProps = true as const;

  render(): Node | null {
    const props = getComponentProps(this) as ForProps<T>;
    const render = resolveRender<T>(props.children, "For");
    if (render === null) return null;
    return mountList(this, props.each, {
      owner: "For",
      render,
      key: resolveKey(props.by),
      positional: null,
      fallback: props.fallback,
      transition: props.transition,
      appear: props.appear === true,
    });
  }
}

/**
 * Positional list, for primitives and lists without stable identity. Row `i` is created once and
 * kept; when the value at `i` changes only the bindings reading `item()` update.
 *
 * @example
 * <Index each={() => this.tags}>
 *   {(tag, i) => <input value={() => tag()} onInput={(e) => { this.rename(i, e) }} />}
 * </Index>
 */
export class Index<T> extends RootComponent<IndexProps<T>> {
  static readonly __isComponent = true as const;
  static readonly __isStateless = true;
  static readonly __jsxRawProps = true as const;

  render(): Node | null {
    const props = getComponentProps(this) as IndexProps<T>;
    const render = resolveRender<T>(props.children, "Index");
    if (render === null) return null;
    return mountList(this, props.each, {
      owner: "Index",
      render,
      key: null,
      positional: updatePositional,
      fallback: props.fallback,
      transition: props.transition,
      appear: props.appear === true,
    });
  }
}
