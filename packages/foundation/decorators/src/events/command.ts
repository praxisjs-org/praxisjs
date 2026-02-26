export interface Command<T = void> {
  trigger(arg: T): void;
  subscribe(handler: (arg: T) => void): () => void;
}

export function createCommand<T = void>(): Command<T> {
  const handlers = new Set<(arg: T) => void>();
  return {
    trigger(arg: T) {
      handlers.forEach((h) => { h(arg); });
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}
