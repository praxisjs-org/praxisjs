import { signal, computed } from "@praxisjs/core/internal";
import type { Computed } from "@praxisjs/shared";

export interface TransitionTarget<S extends string, T extends object = object> {
  target: S;
  guard?: (instance: T) => boolean;
  action?: (instance: T) => void;
}

export type StateMap<S extends string, E extends string, T extends object = object> = Record<
  S,
  {
    on?: Partial<Record<E, S | TransitionTarget<S, T>>>;
    onEnter?: (context?: { event: E; from: S }) => void;
    onExit?: (context?: { event: E; to: S }) => void;
  }
>;

export interface MachineDefinition<
  S extends string,
  E extends string,
  T extends object = object,
> {
  initial: S;
  states: StateMap<S, E, T>;
  onTransition?: (from: S, event: E, to: S) => void;
}

export interface Machine<S extends string, E extends string> {
  state: Computed<S>;
  history: Computed<Array<{ from: S; event: E; to: S }>>;
  send(event: E): boolean;
  can(event: E): boolean;
  is(state: S): boolean;
  reset(): void;
}

function resolveTransition<S extends string, T extends object>(
  config: S | TransitionTarget<S, T> | undefined,
  instance: T,
): { target: S; guard?: () => boolean; action?: () => void } | null {
  if (config == null) return null;
  if (typeof config === "string") return { target: config };
  const { target, guard, action } = config;
  return {
    target,
    guard: guard ? () => guard(instance) : undefined,
    action: action ? () => { action(instance); } : undefined,
  };
}

export function createMachine<
  S extends string,
  E extends string,
  T extends object = object,
>(definition: MachineDefinition<S, E, T>, instance: T = {} as T): Machine<S, E> {
  const _state = signal(definition.initial);
  const _history = signal<Array<{ from: S; event: E; to: S }>>([]);

  function send(event: E): boolean {
    const current = _state();
    const resolved = resolveTransition(
      definition.states[current].on?.[event],
      instance,
    );
    if (!resolved) return false;
    if (resolved.guard && !resolved.guard()) return false;

    const { target: nextState } = resolved;

    definition.states[current].onExit?.({ event, to: nextState });
    _state.set(nextState);
    _history.update((h) => [...h, { from: current, event, to: nextState }]);
    definition.onTransition?.(current, event, nextState);
    resolved.action?.();
    definition.states[nextState].onEnter?.({ event, from: current });
    return true;
  }

  return {
    state: computed(() => _state()),
    history: computed(() => _history()),
    send,
    can: (event) => {
      const resolved = resolveTransition(
        definition.states[_state()].on?.[event],
        instance,
      );
      if (!resolved) return false;
      return !resolved.guard || resolved.guard();
    },
    is: (state) => _state() === state,
    reset: () => {
      definition.states[_state()].onExit?.(undefined);
      _state.set(definition.initial);
      _history.set([]);
      definition.states[definition.initial].onEnter?.(undefined);
    },
  };
}
