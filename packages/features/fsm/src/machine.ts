import { computed, readSignal, SignalNode, writeSignal } from "@praxisjs/core/internal";
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
  /**
   * Maximum number of entries kept in `history`; the oldest are dropped first. `0` disables the
   * history and `Infinity` keeps everything. Defaults to 100: each transition copies the array,
   * so an unbounded history makes a long-running machine slower and larger over time.
   */
  historyLimit?: number;
}

export interface Machine<S extends string, E extends string> {
  state: Computed<S>;
  history: Computed<Array<{ from: S; event: E; to: S }>>;
  send(event: E): boolean;
  can(event: E): boolean;
  is(state: S): boolean;
  reset(): void;
}

interface HistoryEntry<S extends string, E extends string> {
  from: S;
  event: E;
  to: S;
}

function normalize<S extends string, T extends object>(
  config: S | TransitionTarget<S, T>,
): TransitionTarget<S, T> {
  return typeof config === "string" ? { target: config } : config;
}

const DEFAULT_HISTORY_LIMIT = 100;

export function createMachine<
  S extends string,
  E extends string,
  T extends object = object,
>(definition: MachineDefinition<S, E, T>, instance: T = {} as T): Machine<S, E> {
  const stateNode = new SignalNode(definition.initial);
  const historyNode = new SignalNode<Array<HistoryEntry<S, E>>>([]);
  const limit = definition.historyLimit ?? DEFAULT_HISTORY_LIMIT;

  function transitionFor(state: S, event: E): TransitionTarget<S, T> | null {
    const config = definition.states[state].on?.[event];
    return config == null ? null : normalize(config);
  }

  // Reads the current state without tracking: sending is a write, so an effect that sends must not
  // re-run because the state it just changed moved.
  function send(event: E): boolean {
    const current = stateNode.value;
    const transition = transitionFor(current, event);
    if (!transition) return false;
    if (transition.guard && !transition.guard(instance)) return false;

    const nextState = transition.target;

    definition.states[current].onExit?.({ event, to: nextState });
    writeSignal(stateNode, nextState);
    if (limit !== 0) {
      const prev = historyNode.value;
      const next = prev.length < limit ? prev.slice() : prev.slice(prev.length - limit + 1);
      next.push({ from: current, event, to: nextState });
      writeSignal(historyNode, next);
    }
    definition.onTransition?.(current, event, nextState);
    transition.action?.(instance);
    definition.states[nextState].onEnter?.({ event, from: current });
    return true;
  }

  return {
    state: computed(() => readSignal(stateNode)),
    history: computed(() => readSignal(historyNode)),
    send,
    can: (event) => {
      const transition = transitionFor(readSignal(stateNode), event);
      if (!transition) return false;
      return !transition.guard || transition.guard(instance);
    },
    is: (state) => readSignal(stateNode) === state,
    reset: () => {
      definition.states[stateNode.value].onExit?.(undefined);
      writeSignal(stateNode, definition.initial);
      writeSignal(historyNode, []);
      definition.states[definition.initial].onEnter?.(undefined);
    },
  };
}
