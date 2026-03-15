import { signal, effect } from "@praxisjs/core/internal";

export function createStore<T extends Record<string, unknown>>(
  definition: T & ThisType<T>,
) {
  const initialState: Record<string, unknown> = {};
  const methods: Record<string, (...args: unknown[]) => unknown> = {};

  for (const [key, value] of Object.entries(definition)) {
    if (typeof value === "function")
      methods[key] = value as (...args: unknown[]) => unknown;
    else initialState[key] = value;
  }

  const signals: Record<string, ReturnType<typeof signal>> = {};
  for (const [key, value] of Object.entries(initialState)) {
    signals[key] = signal(value);
  }

  const store = new Proxy({} as T, {
    get(_t, key: string | symbol) {
      if (typeof key !== "string") return undefined;
      if (key in methods)
        return (...args: unknown[]): unknown =>
          methods[key].call(store, ...args);
      if (key === "$subscribe") return subscribe;
      if (key === "$reset") return reset;
      if (key === "$patch") return patch;
      if (key === "$state") return getState;
      if (key in signals) return signals[key]();
      const desc = Object.getOwnPropertyDescriptor(definition, key);
      if (desc?.get) return desc.get.call(store) as unknown;
      return undefined;
    },
    set(_t, key: string | symbol, value: unknown) {
      if (typeof key !== "string") return true;
      if (key in signals) {
        signals[key].set(value);
        return true;
      }
      return false;
    },
  });

  function getState(): Record<string, unknown> {
    const s: Record<string, unknown> = {};
    for (const k of Object.keys(signals)) s[k] = signals[k]();
    return s;
  }

  function subscribe(fn: (state: Record<string, unknown>) => void): () => void {
    return effect(() => {
      fn(getState());
    });
  }

  function reset(): void {
    for (const [k, v] of Object.entries(initialState)) signals[k].set(v);
  }

  function patch(partial: Partial<Record<string, unknown>>): void {
    for (const [k, v] of Object.entries(partial)) {
      if (k in signals) signals[k].set(v);
    }
  }

  return () => store;
}
