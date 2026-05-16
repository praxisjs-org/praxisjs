export type Effect = () => void;

export let activeEffect: Effect | null = null;
const effectStack: Effect[] = [];

export function track(effect: Effect) {
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
    stopped = true;
    cleanup?.();
    cleanup = undefined;
  };
}
