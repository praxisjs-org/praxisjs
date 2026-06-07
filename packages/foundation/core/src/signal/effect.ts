export type Effect = () => void;
export type SubList = Effect | Effect[] | null;
export interface SubscriberHolder {
  subs: SubList;
}

type TrackedEffect = Effect & { __deps?: Set<SubscriberHolder> };

export let activeEffect: Effect | null = null;
const effectStack: Effect[] = [];

function removeTrackedSub(holder: SubscriberHolder, eff: Effect): void {
  const subs = holder.subs;
  if (subs === null) return;
  if (typeof subs === "function") {
    if (subs === eff) holder.subs = null;
    return;
  }
  const idx = subs.indexOf(eff);
  if (idx >= 0) subs.splice(idx, 1);
  if (subs.length === 0) holder.subs = null;
}

export function recordDependency(eff: Effect, holder: SubscriberHolder): void {
  const tracked = eff as TrackedEffect;
  tracked.__deps ??= new Set();
  tracked.__deps.add(holder);
}

export function cleanupEffectDeps(eff: Effect): void {
  const tracked = eff as TrackedEffect;
  const deps = tracked.__deps;
  if (!deps) return;
  for (const holder of deps) removeTrackedSub(holder, eff);
  deps.clear();
}

export function track(effect: Effect) {
  cleanupEffectDeps(effect);
  effectStack.push(effect);
  activeEffect = effect;
  try {
    effect();
  } finally {
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1] ?? null;
  }
}

export function runEffect(effect: Effect | null) {
  activeEffect = effect;
}

export function untrack<T>(fn: () => T): T {
  const prev = activeEffect;
  activeEffect = null;
  try {
    return fn();
  } finally {
    activeEffect = prev;
  }
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type Cleanup = (() => void) | void;

export function effect(fn: () => Cleanup) {
  let cleanup: Cleanup;
  let stopped = false;

  function run(): void {
    if (stopped) return;
    cleanupEffectDeps(run);
    cleanup?.();
    const prev = activeEffect;
    activeEffect = run;
    try {
      cleanup = fn();
    } finally {
      activeEffect = prev;
    }
  }

  run();

  return function stop(): void {
    if (stopped) return;
    stopped = true;
    cleanupEffectDeps(run);
    cleanup?.();
    cleanup = undefined;
  };
}
