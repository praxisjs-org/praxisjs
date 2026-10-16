import { activeSub, createEffect, DIRTY, disposeEffect, endBatch, notify, PENDING, startBatch, track, WatchedNode, type EffectNode } from "./graph";

export type Selector<K> = (key: K) => boolean;
export type SelectorEquals<K, T> = (key: K, value: T) => boolean;

// Keys live in a Map, so the default comparison has to be the Map's own (SameValueZero): a key
// that compares equal must be the one the lookup finds, or a bucket would never be notified.
function sameValueZero(a: unknown, b: unknown): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

interface BucketOwner<K> {
  drop(key: K): void;
}

// One class for every selector's buckets (rather than one declared per selector call), so the
// graph code that reads and links them always sees the same shape.
// Declared and assigned rather than parameter properties, which compile to class fields that are
// defined one by one and make buckets (one per row reading a selector) slower to create.
class Bucket<K> extends WatchedNode {
  declare readonly key: K;
  private declare readonly owner: BucketOwner<K>;

  constructor(key: K, owner: BucketOwner<K>) {
    super();
    this.key = key;
    this.owner = owner;
  }

  // A bucket drops itself from its selector once its last subscriber unlinks (re-run or disposal).
  unwatched(): void {
    this.owner.drop(this.key);
  }
}

// Keeps the bucket shape alive across full GCs; see the shape keepers in graph.ts.
Object.defineProperty(Bucket, "shapeKeeper", {
  value: new Bucket<unknown>(undefined, {
    drop() {
      // Never called: the keeper has no subscriber to lose.
    },
  }),
});

export function selector<T>(source: () => T): Selector<T>;
export function selector<T, K>(source: () => T, equals: SelectorEquals<K, T>): Selector<K>;
export function selector<T, K>(source: () => T, equals?: SelectorEquals<K, T>): Selector<K> {
  const compare = equals ?? (sameValueZero as SelectorEquals<K, T>);
  const buckets = new Map<K, WatchedNode>();
  let current: T;
  let sourceEffect: EffectNode | null = null;
  let releaseScheduled = false;

  // The source subscription goes with the last bucket, so removed rows leave nothing behind.
  const owner: BucketOwner<K> = {
    drop(key) {
      buckets.delete(key);
      if (buckets.size === 0) scheduleRelease();
    },
  };

  function changedBuckets(prev: T, next: T): WatchedNode[] {
    const changed: WatchedNode[] = [];
    if (equals === undefined) {
      if (sameValueZero(prev, next)) return changed;
      const prevBucket = buckets.get(prev as unknown as K);
      const nextBucket = buckets.get(next as unknown as K);
      if (prevBucket !== undefined) changed.push(prevBucket);
      if (nextBucket !== undefined) changed.push(nextBucket);
      return changed;
    }
    for (const [key, bucket] of buckets) {
      if (compare(key, prev) !== compare(key, next)) changed.push(bucket);
    }
    return changed;
  }

  // Batched so an effect reading several affected keys re-runs once, and so no subscriber runs
  // (and unlinks) while the buckets are still being walked.
  function notifyChanged(prev: T, next: T): void {
    const changed = changedBuckets(prev, next);
    if (changed.length === 0) return;
    startBatch();
    try {
      for (const bucket of changed) {
        bucket.version++;
        notify(bucket);
      }
    } finally {
      endBatch();
    }
  }

  function activate(): void {
    let initialized = false;
    sourceEffect = createEffect(() => {
      const next = source();
      const prev = current;
      current = next;
      if (!initialized) {
        initialized = true;
        return;
      }
      notifyChanged(prev, next);
    });
  }

  // An effect re-running unlinks its bucket right before reading the key again, and a list
  // re-render unlinks every bucket before the new rows subscribe. Waiting a microtask keeps the
  // source subscribed through both instead of stopping and re-reading it each time.
  function scheduleRelease(): void {
    if (releaseScheduled) return;
    releaseScheduled = true;
    queueMicrotask(() => {
      releaseScheduled = false;
      if (buckets.size > 0) return;
      const stop = sourceEffect as EffectNode;
      sourceEffect = null;
      disposeEffect(stop);
    });
  }

  return function select(key: K): boolean {
    if (activeSub === undefined) {
      // `current` lags the source while the source effect waits to run (a write inside a batch, or
      // a computed source, whose effects run a microtask later). A tracked read keeps the cached
      // value, which the effect's run then corrects through the buckets; nothing corrects this one.
      const fresh = sourceEffect !== null && (sourceEffect.flags & (DIRTY | PENDING)) === 0;
      return compare(key, fresh ? current : source());
    }
    if (sourceEffect === null) activate();
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = new Bucket(key, owner);
      buckets.set(key, bucket);
    }
    track(bucket);
    return compare(key, current);
  };
}
