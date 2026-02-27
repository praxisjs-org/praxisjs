export type LifeCycleHook =
  | "onBeforeMount"
  | "onMount"
  | "onBeforeUpdate"
  | "onUpdate"
  | "onAfterUpdate"
  | "onUnmount"
  | "onError";

export const VALID_LIFECYCLE_HOOK_SIGNATURES: Record<LifeCycleHook, string> = {
  onBeforeMount: "(): void",
  onMount: "(): void",
  onUnmount: "(): void",

  onBeforeUpdate: "(prevProps: Record<string, unknown>): void",
  onUpdate: "(prevProps: Record<string, unknown>): void",
  onAfterUpdate: "(prevProps: Record<string, unknown>): void",

  onError: "(error: Error): void",
};

export interface FunctionalContext {
  onBeforeMount: Array<() => void>;
  onMount: Array<() => void>;
  onUnmount: Array<() => void>;
  onError: Array<(error: Error) => void>;
}

let _functionalContext: FunctionalContext | null = null;

export function setFunctionalContext(ctx: FunctionalContext | null): void {
  _functionalContext = ctx;
}

export function createFunctionalContext(): FunctionalContext {
  return {
    onBeforeMount: [],
    onMount: [],
    onUnmount: [],
    onError: [],
  };
}

export function onBeforeMount(fn: () => void): void {
  if (_functionalContext) {
    _functionalContext.onBeforeMount.push(fn);
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("[onBeforeMount] Called outside of a functional component context.");
  }
}

export function onMount(fn: () => void): void {
  if (_functionalContext) {
    _functionalContext.onMount.push(fn);
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("[onMount] Called outside of a functional component context.");
  }
}

export function onUnmount(fn: () => void): void {
  if (_functionalContext) {
    _functionalContext.onUnmount.push(fn);
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("[onUnmount] Called outside of a functional component context.");
  }
}

export function onError(fn: (error: Error) => void): void {
  if (_functionalContext) {
    _functionalContext.onError.push(fn);
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("[onError] Called outside of a functional component context.");
  }
}
