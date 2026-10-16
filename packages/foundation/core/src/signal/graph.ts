// Push-pull reactive graph. Sources (signals, computeds, selector buckets) keep a doubly linked
// list of subscriber links, subscribers (computeds, effects) keep a singly linked list of the
// same links in read order. A re-run walks its previous links in order and reuses every link
// whose source is read again in the same position, so a binding that reads the same sources on
// every run allocates nothing and never unsubscribes. Writes push DIRTY to direct subscribers
// and PENDING further down; reads pull, recomputing a computed only when one of its sources
// actually changed (tracked with per-node versions).

export const DIRTY = 1;
export const PENDING = 2;
export const QUEUED = 4;
export const RUNNING = 8;
export const DISPOSED = 16;
export const COMPUTED = 32;
export const EFFECT = 64;
export const HAS_ERROR = 128;
/** The node is a WatchedNode: it wants to know when its last subscriber goes away. */
export const WATCHED = 256;
/** An effect waiting for the deferred pass (see `defer`). */
export const DEFERRED = 512;

// Fields are declared with `declare` and assigned in the constructors: class field initializers
// define each property one by one, which makes these objects (created by the thousand per render)
// about twice as slow to allocate.

export class Link {
  declare dep: ReactiveNode;
  declare sub: ReactiveNode;
  declare version: number;
  declare nextDep: Link | undefined;
  declare prevSub: Link | undefined;
  declare nextSub: Link | undefined;

  constructor(dep: ReactiveNode, sub: ReactiveNode, nextDep: Link | undefined, prevSub: Link | undefined) {
    this.dep = dep;
    this.sub = sub;
    this.version = dep.version;
    this.nextDep = nextDep;
    this.prevSub = prevSub;
    this.nextSub = undefined;
  }
}

export class ReactiveNode {
  declare flags: number;
  declare version: number;
  declare subs: Link | undefined;
  declare subsTail: Link | undefined;
  declare deps: Link | undefined;
  declare depsTail: Link | undefined;

  constructor(flags: number) {
    this.flags = flags;
    this.version = 0;
    this.subs = undefined;
    this.subsTail = undefined;
    this.deps = undefined;
    this.depsTail = undefined;
  }
}

export abstract class WatchedNode extends ReactiveNode {
  constructor() {
    super(WATCHED);
  }

  abstract unwatched(): void;
}

export class SignalNode<T = unknown> extends ReactiveNode {
  declare value: T;

  constructor(value: T) {
    super(0);
    this.value = value;
  }
}

export class ComputedNode<T = unknown> extends ReactiveNode {
  declare value: T | undefined;
  declare error: unknown;
  declare getter: () => T;

  constructor(getter: () => T) {
    super(COMPUTED | DIRTY);
    this.value = undefined;
    this.error = undefined;
    this.getter = getter;
  }
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type EffectCleanup = (() => void) | void;

// Method syntax keeps `this` bivariant, so an EffectNode<Ctx> is still an EffectNode to code that
// handles effects of every kind (disposal, scheduling).
type EffectFn<Ctx> = { run(this: EffectNode<Ctx>): EffectCleanup }["run"];

export class EffectNode<Ctx = unknown> extends ReactiveNode {
  /** Called as a method, so `this` is the node: a function shared by many effects reads `ctx`. */
  declare fn: EffectFn<Ctx>;
  declare cleanup: EffectCleanup;
  /** What was rendering when the effect was created (see setCurrentOwner), for tooling. */
  declare owner: object | undefined;
  /** State of an effect whose `fn` is shared, kept here instead of in a closure per effect. */
  declare ctx: Ctx;

  constructor(fn: EffectFn<Ctx>, owner?: object, ctx?: Ctx) {
    super(EFFECT);
    this.fn = fn;
    this.cleanup = undefined;
    this.owner = owner;
    this.ctx = ctx as Ctx;
  }
}

// ── Shape keepers ───────────────────────────────────────────────────────────

// V8 holds map transitions weakly: once every instance of a class is collected (a list cleared
// right before a full GC), the hidden class its constructor builds dies with them, and the
// optimized code and inline caches that embedded it are thrown away, so the next render runs cold.
// One inert instance of each hot class, never linked into a graph, keeps those shapes alive. Its
// fields get the same assignments, in the same order, as real instances; values a user may supply
// start as undefined, which no later value forces off the shared map (a number would, for one).
// Stored with Object.defineProperty because bundlers drop a module-level instance nothing reads.

function noop(): void {
  // The keepers never run: their functions only fill the field.
}

const signalKeeper = new SignalNode(undefined);
const effectKeeper = new EffectNode(noop);
Object.defineProperty(SignalNode, "shapeKeeper", { value: signalKeeper });
Object.defineProperty(ComputedNode, "shapeKeeper", { value: new ComputedNode(noop) });
Object.defineProperty(EffectNode, "shapeKeeper", { value: effectKeeper });
Object.defineProperty(Link, "shapeKeeper", { value: new Link(signalKeeper, effectKeeper, undefined, undefined) });

export let activeSub: ReactiveNode | undefined = undefined;

// ── Instrumentation ─────────────────────────────────────────────────────────

/**
 * Receives what the graph does, for tooling (devtools profiling). While none is set the graph pays
 * one flag check per write, computed run and effect run, and production bundles of an app that
 * never sets one none at all.
 */
export interface ReactiveObserver {
  /** A signal (or selector bucket) was written and its subscribers marked. */
  write?(node: ReactiveNode): void;
  /** A computed recomputed, taking `ms`. */
  compute?(node: ComputedNode, ms: number): void;
  /** An effect ran, taking `ms`; `owner` is what was rendering when it was created, if known. */
  effect?(node: EffectNode, ms: number, owner: object | undefined): void;
}

let observer: ReactiveObserver | null = null;
// The checks read this flag, not `observer`: minifiers fold a boolean that nothing ever sets to true
// (no observer is installed in an app without devtools), which drops the instrumentation from
// production bundles. A null check is not folded.
let observing = false;
let currentOwner: object | undefined = undefined;

/** Installs an observer (null removes it) and returns the previous one. */
export function setReactiveObserver(next: ReactiveObserver | null): ReactiveObserver | null {
  const prev = observer;
  observer = next;
  observing = next !== null;
  return prev;
}

/**
 * Marks what is being rendered, so effects created meanwhile are attributed to it, whether or not
 * an observer is installed yet. Returns the previous owner, to restore afterwards.
 */
export function setCurrentOwner(owner: object | undefined): object | undefined {
  const prev = currentOwner;
  currentOwner = owner;
  return prev;
}

export function getEffectOwner(node: EffectNode): object | undefined {
  return node.owner;
}

export function setActiveSub(sub: ReactiveNode | undefined): ReactiveNode | undefined {
  const prev = activeSub;
  activeSub = sub;
  return prev;
}

/** Stops dependency tracking until `resumeTracking(prev)`; the closure-free form of untrack(). */
export function pauseTracking(): ReactiveNode | undefined {
  return setActiveSub(undefined);
}

export function resumeTracking(prev: ReactiveNode | undefined): void {
  activeSub = prev;
}

// ── Tracking ────────────────────────────────────────────────────────────────

export function track(dep: ReactiveNode): void {
  const sub = activeSub;
  if (sub === undefined) return;
  const prevDep = sub.depsTail;
  if (prevDep?.dep === dep) {
    prevDep.version = dep.version;
    return;
  }
  const nextDep = prevDep !== undefined ? prevDep.nextDep : sub.deps;
  if (nextDep?.dep === dep) {
    nextDep.version = dep.version;
    sub.depsTail = nextDep;
    return;
  }
  // Read again out of order within the same run: the link already exists among the ones kept
  // so far, so another one would only notify the subscriber twice.
  const depsTail = dep.subsTail;
  if (depsTail?.sub === sub && isTrackedLink(depsTail, sub)) {
    depsTail.version = dep.version;
    return;
  }
  const link = new Link(dep, sub, nextDep, dep.subsTail);
  if (prevDep !== undefined) prevDep.nextDep = link;
  else sub.deps = link;
  sub.depsTail = link;
  if (dep.subsTail !== undefined) dep.subsTail.nextSub = link;
  else dep.subs = link;
  dep.subsTail = link;
}

// Whether `link` is among the ones `sub` has read so far in its current run (deps up to depsTail).
function isTrackedLink(link: Link, sub: ReactiveNode): boolean {
  const tail = sub.depsTail;
  if (tail === undefined) return false;
  let current = sub.deps as Link;
  for (;;) {
    if (current === link) return true;
    if (current === tail) return false;
    current = current.nextDep as Link;
  }
}

export function startTracking(sub: ReactiveNode): ReactiveNode | undefined {
  sub.depsTail = undefined;
  sub.flags = (sub.flags & ~(DIRTY | PENDING)) | RUNNING;
  return setActiveSub(sub);
}

export function endTracking(sub: ReactiveNode, prev: ReactiveNode | undefined): void {
  activeSub = prev;
  sub.flags &= ~RUNNING;
  // Disposed during its own run (its scope went away): whatever it read after that must not keep it.
  if ((sub.flags & DISPOSED) !== 0) {
    unlinkDeps(sub);
    return;
  }
  const tail = sub.depsTail;
  let stale = tail !== undefined ? tail.nextDep : sub.deps;
  if (stale !== undefined) {
    if (tail !== undefined) tail.nextDep = undefined;
    else sub.deps = undefined;
    while (stale !== undefined) stale = unlink(stale);
  }
}

/** Removes every dependency of `sub`. */
export function unlinkDeps(sub: ReactiveNode): void {
  let link = sub.deps;
  sub.deps = undefined;
  sub.depsTail = undefined;
  while (link !== undefined) link = unlink(link);
}

function unlink(link: Link): Link | undefined {
  const dep = link.dep;
  const next = link.nextDep;
  const prevSub = link.prevSub;
  const nextSub = link.nextSub;
  if (prevSub !== undefined) prevSub.nextSub = nextSub;
  else dep.subs = nextSub;
  if (nextSub !== undefined) nextSub.prevSub = prevSub;
  else dep.subsTail = prevSub;
  if (dep.subs === undefined && (dep.flags & WATCHED) !== 0) (dep as WatchedNode).unwatched();
  return next;
}

// ── Propagation ─────────────────────────────────────────────────────────────

let batchDepth = 0;
let flushing = false;
const queue: EffectNode[] = [];
let queueIndex = 0;

export function isBatching(): boolean {
  return batchDepth > 0;
}

export function startBatch(): void {
  batchDepth++;
}

export function endBatch(): void {
  if (--batchDepth === 0) flush();
}

/** Marks the direct subscribers of a changed source and runs the effects that became stale. */
export function notify(dep: ReactiveNode): void {
  let link = dep.subs;
  if (link === undefined) return;
  do {
    mark(link, DIRTY);
    link = link.nextSub;
  } while (link !== undefined);
  if (batchDepth === 0) flush();
}

function mark(link: Link, flag: number): void {
  const node = link.sub;
  const flags = node.flags;
  // A subscriber that is running only depends on what it has read so far in this run: a write to
  // a source it has not read again yet does not make the run stale.
  if ((flags & RUNNING) !== 0 && !isTrackedLink(link, node)) return;
  if ((flags & (DIRTY | PENDING)) !== 0) {
    // Already stale: only an upgrade from PENDING to DIRTY changes anything, and its
    // subscribers were marked when it first went stale. An effect upgraded this way read a signal
    // that changed, so it joins the synchronous pass instead of waiting for the deferred one.
    if (flag === DIRTY) {
      node.flags = flags | DIRTY;
      if ((flags & EFFECT) !== 0 && (flags & (QUEUED | RUNNING)) === 0) enqueue(node as EffectNode);
    }
    return;
  }
  node.flags = flags | flag;
  if ((flags & EFFECT) !== 0) {
    // A running effect that invalidates itself is queued again once it finishes.
    if ((flags & (QUEUED | RUNNING)) !== 0) return;
    if (flag === DIRTY) enqueue(node as EffectNode);
    else defer(node as EffectNode);
    return;
  }
  let sub = node.subs;
  while (sub !== undefined) {
    mark(sub, PENDING);
    sub = sub.nextSub;
  }
}

function enqueue(node: EffectNode): void {
  node.flags |= QUEUED;
  queue.push(node);
}

// Effects that only depend on a change through a computed run in a microtask, so every write of the
// same synchronous block reaches them as one update with the final values. They pull fresh values
// when they run, and one that already re-ran for a direct change in the meantime is skipped.
const deferred: EffectNode[] = [];
let deferredScheduled = false;

function defer(node: EffectNode): void {
  if ((node.flags & DEFERRED) !== 0) return;
  node.flags |= DEFERRED;
  deferred.push(node);
  if (deferredScheduled) return;
  deferredScheduled = true;
  queueMicrotask(flushDeferred);
}

function flushDeferred(): void {
  deferredScheduled = false;
  // The synchronous queue always drains before a microtask, so none of these is queued already.
  for (const node of deferred) {
    node.flags &= ~DEFERRED;
    enqueue(node);
  }
  deferred.length = 0;
  flush();
}

export function flush(): void {
  if (flushing) return;
  flushing = true;
  let error: unknown;
  let hasError = false;
  try {
    while (queueIndex < queue.length) {
      const node = queue[queueIndex++];
      node.flags &= ~QUEUED;
      try {
        if (isStale(node)) runEffect(node);
      } catch (e) {
        error = e;
        hasError = true;
      }
    }
  } finally {
    queue.length = 0;
    queueIndex = 0;
    flushing = false;
  }
  if (hasError) throw error;
}

// ── Pull ────────────────────────────────────────────────────────────────────

/** Whether a subscriber has to re-run: DIRTY, or PENDING with a source that really changed. */
export function isStale(node: ReactiveNode): boolean {
  const flags = node.flags;
  if ((flags & DISPOSED) !== 0) return false;
  if ((flags & (DIRTY | HAS_ERROR)) !== 0) return true;
  if ((flags & PENDING) === 0) return false;
  let link = node.deps;
  while (link !== undefined) {
    const dep = link.dep;
    if ((dep.flags & COMPUTED) !== 0) refreshComputed(dep as ComputedNode);
    if (link.version !== dep.version) {
      node.flags |= DIRTY;
      return true;
    }
    link = link.nextDep;
  }
  node.flags &= ~PENDING;
  return false;
}

export function refreshComputed(node: ComputedNode): void {
  if ((node.flags & RUNNING) !== 0) throw new Error("[PraxisJS] Cycle detected while computing a value");
  if (!isStale(node)) return;
  const prev = startTracking(node);
  let value: unknown;
  let threw = false;
  const start = observing ? performance.now() : 0;
  try {
    value = node.getter();
  } catch (e) {
    value = e;
    threw = true;
  } finally {
    endTracking(node, prev);
    if (observing) (observer as ReactiveObserver).compute?.(node, performance.now() - start);
  }
  if (threw) {
    // HAS_ERROR keeps it stale so the next read retries, without the DIRTY flag that would stop
    // later source changes from reaching its subscribers. The error is rethrown to every reader.
    node.flags |= HAS_ERROR;
    node.error = value;
    node.version++;
    return;
  }
  const hadError = (node.flags & HAS_ERROR) !== 0;
  node.flags &= ~HAS_ERROR;
  node.error = undefined;
  if (hadError || node.version === 0 || !Object.is(node.value, value)) {
    node.value = value;
    node.version++;
  }
}

export function readComputed<T>(node: ComputedNode<T>): T {
  refreshComputed(node);
  track(node);
  if ((node.flags & HAS_ERROR) !== 0) throw node.error;
  return node.value as T;
}

// ── Effects ─────────────────────────────────────────────────────────────────

export function runEffect(node: EffectNode): void {
  const cleanup = node.cleanup;
  if (cleanup !== undefined) {
    node.cleanup = undefined;
    const prevSub = setActiveSub(undefined);
    try {
      cleanup();
    } finally {
      activeSub = prevSub;
    }
  }
  const prev = startTracking(node);
  // Effects created while this one runs (a reactive child rendering its content) inherit its owner.
  const prevOwner = currentOwner;
  if (node.owner !== undefined) currentOwner = node.owner;
  try {
    if (!observing) node.cleanup = node.fn();
    else runObserved(node);
  } finally {
    currentOwner = prevOwner;
    endTracking(node, prev);
    // Invalidated while it ran: run again with the pass its invalidation calls for.
    const flags = node.flags;
    if ((flags & (DISPOSED | QUEUED)) === 0) {
      if ((flags & DIRTY) !== 0) {
        enqueue(node);
        if (batchDepth === 0) flush();
      } else if ((flags & PENDING) !== 0) {
        defer(node);
      }
    }
  }
}

function runObserved(node: EffectNode): void {
  const start = performance.now();
  try {
    node.cleanup = node.fn();
  } finally {
    (observer as ReactiveObserver).effect?.(node, performance.now() - start, node.owner);
  }
}

export function disposeEffect(node: EffectNode): void {
  if ((node.flags & DISPOSED) !== 0) return;
  node.flags |= DISPOSED;
  unlinkDeps(node);
  const cleanup = node.cleanup;
  node.cleanup = undefined;
  if (cleanup !== undefined) {
    const prevSub = setActiveSub(undefined);
    try {
      cleanup();
    } finally {
      activeSub = prevSub;
    }
  }
}

export function createEffect(fn: () => EffectCleanup): EffectNode {
  const node = new EffectNode(fn, currentOwner);
  runEffect(node);
  return node;
}

/**
 * Creates and runs an effect whose `fn` reads its state from `this.ctx`: one function can serve
 * every effect of a kind (each DOM binding of a render), and each effect allocates no closure.
 */
export function createContextEffect<Ctx>(fn: (this: EffectNode<Ctx>) => EffectCleanup, ctx: Ctx): EffectNode<Ctx> {
  const node = new EffectNode(fn, currentOwner, ctx);
  runEffect(node);
  return node;
}

// ── Signals ─────────────────────────────────────────────────────────────────

export function readSignal<T>(node: SignalNode<T>): T {
  if (activeSub !== undefined) track(node);
  return node.value;
}

export function writeSignal<T>(node: SignalNode<T>, value: T): void {
  const prev = node.value;
  // Object.is, inline: writes are hot and often run before the graph code is optimized, where a
  // builtin call costs more than these comparisons.
  if (prev === value ? value !== 0 || 1 / (value as number) === 1 / (prev as number) : value !== value && prev !== prev) {
    return;
  }
  node.value = value;
  node.version++;
  if (observing) (observer as ReactiveObserver).write?.(node);
  // A signal nothing reads yet (a model being built) needs no notification pass.
  if (node.subs !== undefined) notify(node);
}
