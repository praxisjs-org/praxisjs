import type { Scope } from "./scope";

let _currentScope: Scope | null = null;

/** Owner of a child scope that is created only once something asks for it (see swapLazyScope). */
export interface LazyScopeHost {
  parentScope: Scope;
  scope: Scope | null;
}

let lazyHost: LazyScopeHost | null = null;

export function getCurrentScope(): Scope {
  if (_currentScope === null) {
    if (lazyHost === null) {
      throw new Error(
        "[PraxisJS] jsx() called outside of a render context. Make sure to call render() with a factory function.",
      );
    }
    _currentScope = lazyHost.scope ??= lazyHost.parentScope.fork();
  }
  return _currentScope;
}

/**
 * Makes `host` the scope source while no scope is current: its child scope is forked from
 * `host.parentScope` the first time code asks for the current scope, so a run that registers
 * nothing (a reactive text binding) creates no scope at all. Returns the previous host, which the
 * caller must restore in a `finally`, together with the current scope (set it to `host.scope`).
 */
export function swapLazyScope(host: LazyScopeHost | null): LazyScopeHost | null {
  const prev = lazyHost;
  lazyHost = host;
  return prev;
}

export function runInScope<T>(scope: Scope, fn: () => T): T {
  const prev = _currentScope;
  _currentScope = scope;
  try {
    return fn();
  } finally {
    _currentScope = prev;
  }
}

// Same as runInScope without a closure per call, for hot paths that create many scopes in a row.
// Callers must restore the returned scope in a `finally`.
export function swapScope(scope: Scope | null): Scope | null {
  const prev = _currentScope;
  _currentScope = scope;
  return prev;
}
