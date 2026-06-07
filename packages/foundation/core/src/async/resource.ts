import type { Computed, Signal } from "@praxisjs/shared";

import { computed, signal } from "../signal";
import {
  getCacheEntry,
  setCacheEntry,
  deleteInflight,
  getInflight,
  setInflight,
  registerResource,
  unregisterResource,
} from "./resource-cache";
import { effect, untrack } from "../signal/effect";

export type ResourceStatus = "idle" | "pending" | "success" | "error";

export interface Resource<T> {
  readonly data: Computed<T | null>;
  readonly pending: Computed<boolean>;
  readonly error: Computed<unknown>;
  readonly status: Computed<ResourceStatus>;
  refetch(): void;
  cancel(): void;
  mutate(data: T): void;
  destroy(): void;
}

export interface ResourceOptions<T> {
  initialData?: T;
  immediate?: boolean;
  keepPreviousData?: boolean;
  key?: string;
  staleTime?: number;
  refetchOnFocus?: boolean;
}

export function resource<T>(
  fetcher: () => Promise<T>,
  options: ResourceOptions<T> = {},
): Resource<T> {
  const {
    initialData = null,
    immediate = true,
    keepPreviousData = false,
    key,
    staleTime = 0,
    refetchOnFocus = false,
  } = options;

  const cached = key ? getCacheEntry(key) : undefined;
  const isCacheFresh =
    cached !== undefined && Date.now() - cached.timestamp < staleTime;

  const _data = signal(cached ? (cached.data as T) : initialData);
  const _error = signal<Error | null>(null);
  const _status = signal<ResourceStatus>(cached ? "success" : "idle");

  let _runId = 0;

  function _execute(fn: Promise<T>): void {
    const currentRunId = ++_runId;

    function clearInflight(): void {
      if (key && getInflight(key) === fn) deleteInflight(key);
    }

    // untrack: _data.set(result) in the resolve handler must not re-trigger the enclosing effect.
    const hasCachedData = key !== undefined && untrack(() => _data()) !== null;
    if (!keepPreviousData && !hasCachedData) {
      _data.set(null);
    }
    _error.set(null);
    _status.set("pending");

    fn.then((result) => {
      clearInflight();
      if (currentRunId !== _runId) return;
      _data.set(result);
      _error.set(null);
      _status.set("success");
      if (key) {
        setCacheEntry(key, result);
      }
    }).catch((err: unknown) => {
      clearInflight();
      if (currentRunId !== _runId) return;
      _error.set(err instanceof Error ? err : new Error(String(err)));
      _status.set("error");
    });
  }

  function _startFetch(): void {
    if (key) {
      const existing = getInflight(key);
      if (existing) {
        _execute(existing as Promise<T>);
        return;
      }
      const promise = fetcher();
      setInflight(key, promise as Promise<unknown>);
      _execute(promise);
    } else {
      _execute(fetcher());
    }
  }

  function execute(): void {
    try {
      _startFetch();
    } catch (err: unknown) {
      _runId++;
      _error.set(err instanceof Error ? err : new Error(String(err)));
      _status.set("error");
    }
  }

  if (key) {
    registerResource(key, execute);
  }

  let stopEffect: (() => void) | undefined;

  if (immediate && !isCacheFresh) {
    stopEffect = effect(() => {
      try {
        if (key) {
          const existing = getInflight(key);
          if (existing) {
            _execute(existing as Promise<T>);
          } else {
            const promise = fetcher();
            setInflight(key, promise as Promise<unknown>);
            _execute(promise);
          }
        } else {
          _execute(fetcher());
        }
      } catch (err: unknown) {
        _runId++;
        _error.set(err instanceof Error ? err : new Error(String(err)));
        _status.set("error");
      }
    });
  }

  let _removeFocusListener: (() => void) | undefined;
  if (refetchOnFocus && typeof document !== "undefined") {
    const onVisibility = (): void => {
      if (document.visibilityState === "visible") {
        execute();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    _removeFocusListener = (): void => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }

  function destroy(): void {
    stopEffect?.();
    stopEffect = undefined;
    _removeFocusListener?.();
    _removeFocusListener = undefined;
    if (key) unregisterResource(key, execute);
  }

  return {
    data: computed(() => _data()),
    pending: computed(() => _status() === "pending"),
    error: computed(() => _error()),
    status: computed(() => _status()),
    refetch() {
      execute();
    },
    cancel() {
      _runId++;
      _status.set("idle");
    },
    mutate(data: T) {
      _runId++;
      _data.set(data);
      _error.set(null);
      _status.set("success");
      if (key) setCacheEntry(key, data);
    },
    destroy,
  };
}

export function createResource<P, T>(
  param: Signal<P> | Computed<P>,
  fetcher: (param: P) => Promise<T>,
  options: ResourceOptions<T> = {},
): Resource<T> {
  return resource(() => fetcher(param()), options);
}
