import { isComponent, type ComponentConstructor } from "@praxisjs/shared/internal";

import type { Scope } from "./scope";

// Hot module replacement of components, driven by the code @praxisjs/vite-plugin appends to each
// module in development: every top-level component class is registered under a stable id (the
// file and the class name). When an edited module runs again, its new classes replace the old ones
// under the same ids, and every mounted instance of an old class is rendered again with the new
// one, in place. Nothing of this runs until a class is registered, so production builds only pay
// the `hotEnabled` checks.

/** A mounted instance of a registered component: what it needs to be mounted again in place. */
export interface HotInstance {
  ctor: ComponentConstructor;
  props: Record<string, unknown>;
  parentScope: Scope;
  scope: Scope;
  start: Comment;
  end: Comment;
}

interface HotRecord {
  current: ComponentConstructor;
  instances: Set<HotInstance>;
}

/** True once a component class was registered: mountComponent then tracks hot instances. */
export let hotEnabled = false;

// A WeakMap, not a static property: a subclass would inherit a property and resolve to its base.
const ids = new WeakMap<ComponentConstructor, string>();
const records = new Map<string, HotRecord>();
const stale = new Set<HotRecord>();

let remount: ((hot: HotInstance, ctor: ComponentConstructor) => void) | null = null;

/** Set by the component module, which owns mounting (kept out of here to avoid an import cycle). */
export function setHotRemount(fn: (hot: HotInstance, ctor: ComponentConstructor) => void): void {
  remount = fn;
}

/** The newest class registered under the id of `ctor`, or `ctor` itself. */
export function latestClass(ctor: ComponentConstructor): ComponentConstructor {
  const id = ids.get(ctor);
  return id === undefined ? ctor : (records.get(id) as HotRecord).current;
}

export function isHotClass(ctor: ComponentConstructor): boolean {
  return ids.has(ctor);
}

/** Records a mounted instance of a registered class until its scope is disposed. */
export function trackHotInstance(hot: HotInstance): void {
  const record = records.get(ids.get(hot.ctor) as string) as HotRecord;
  record.instances.add(hot);
  hot.scope.add(() => { record.instances.delete(hot); });
}

function flush(): void {
  const records = [...stale];
  stale.clear();
  let error: unknown;
  let failed = false;
  for (const record of records) {
    for (const hot of [...record.instances]) {
      // Gone with a parent remounted before it, or already mounted with the new class.
      if (!record.instances.has(hot) || hot.ctor === record.current) continue;
      try {
        (remount as (hot: HotInstance, ctor: ComponentConstructor) => void)(hot, record.current);
      } catch (e) {
        if (!failed) error = e;
        failed = true;
      }
    }
  }
  if (failed) throw error;
}

/**
 * Registers `ctor` under `id`. Called by the code the Vite plugin appends to each module in
 * development, every time the module runs. Mounted instances of a class registered before under
 * the same id are mounted again with `ctor`, in one microtask for every class of the update, so a
 * parent and its children edited together render once. Returns false for a class that is not a
 * component, which is not registered.
 */
export function registerHot(ctor: unknown, id: string): boolean {
  if (!isComponent(ctor)) return false;
  hotEnabled = true;
  ids.set(ctor, id);
  const record = records.get(id);
  if (record === undefined) {
    records.set(id, { current: ctor, instances: new Set() });
  } else if (record.current !== ctor) {
    record.current = ctor;
    if (stale.size === 0) queueMicrotask(flush);
    stale.add(record);
  }
  return true;
}

/**
 * Whether an updated module can replace its previous version in place: every export is a
 * registered component class. Anything else (a helper, a constant, a store) may be held by the
 * modules that import it, so the update has to reach them (Vite then re-runs or reloads them).
 */
export function acceptsHotUpdate(module: Record<string, unknown> | undefined): boolean {
  if (module === undefined) return false;
  const values = Object.values(module);
  return values.length > 0 && values.every((value) => typeof value === "function" && ids.has(value as ComponentConstructor));
}
