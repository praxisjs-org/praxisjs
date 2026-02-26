import { computed, Computed, Signal, signal } from "../signal";
import { effect } from "../signal/effect";

export type ResourceStatus = "idle" | "pending" | "success" | "error";

export interface Resource<T> {
  readonly data: Computed<T | null>;
  readonly pending: Computed<boolean>;
  readonly error: Computed<unknown>;
  readonly status: Computed<ResourceStatus>;
  refetch(): void;
  cancel(): void;
  mutate(data: T): void;
}

export interface ResourceOptions<T> {
  initialData?: T;
  immediate?: boolean;
  keepPreviousData?: boolean;
}

export function resource<T>(
  fetcher: () => Promise<T>,
  options: ResourceOptions<T> = {},
): Resource<T> {
  const {
    initialData = null,
    immediate = true,
    keepPreviousData = false,
  } = options;

  const _data = signal<T | null>(initialData);
  const _error = signal<Error | null>(null);
  const _status = signal<ResourceStatus>("idle");

  let _runId = 0;

  function _execute(fn: Promise<T>) {
    const currentRunId = ++_runId;

    if (!keepPreviousData) {
      _data.set(null);
    }
    _error.set(null);
    _status.set("pending");

    fn.then((result) => {
      if (currentRunId !== _runId) return;
      _data.set(result);
      _error.set(null);
      _status.set("success");
    }).catch((err) => {
      if (currentRunId !== _runId) return;
      _error.set(err instanceof Error ? err : new Error(String(err)));
      _status.set("error");
    });
  }

  function execute() {
    _execute(fetcher());
  }

  if (immediate) {
    effect(() => {
      _execute(fetcher());
    });
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
    },
  };
}

export function createResource<P, T>(
  param: Signal<P> | Computed<P>,
  fetcher: (param: P) => Promise<T>,
  options: ResourceOptions<T> = {},
): Resource<T> {
  return resource(() => fetcher(param()), options);
}
