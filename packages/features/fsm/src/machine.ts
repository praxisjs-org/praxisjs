import { signal, computed } from "@verbose/core";
import type { Computed } from "@verbose/shared";

export type StateMap<S extends string, E extends string> = Record<S, {
    on?: Partial<Record<E, S>>;
    onEnter?: () => void;
    onExit?: () => void;
  }>;

export interface MachineDefinition<S extends string, E extends string> {
  initial: S;
  states: StateMap<S, E>;
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

export function createMachine<S extends string, E extends string>(
  definition: MachineDefinition<S, E>,
): Machine<S, E> {
  const _state = signal<S>(definition.initial);
  const _history = signal<Array<{ from: S; event: E; to: S }>>([]);

  function send(event: E): boolean {
    const current = _state();
    const nextState = definition.states[current].on?.[event];
    if (!nextState) return false;

    definition.states[current].onExit?.();
    _state.set(nextState);
    _history.update((h) => [...h, { from: current, event, to: nextState }]);
    definition.onTransition?.(current, event, nextState);
    definition.states[nextState].onEnter?.();
    return true;
  }

  return {
    state: computed(() => _state()),
    history: computed(() => _history()),
    send,
    can: (event) => !!definition.states[_state()].on?.[event],
    is: (state) => _state() === state,
    reset: () => {
      definition.states[_state()].onExit?.();
      _state.set(definition.initial);
      _history.set([]);
      definition.states[definition.initial].onEnter?.();
    },
  };
}
