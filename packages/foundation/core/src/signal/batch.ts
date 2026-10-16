import { endBatch, startBatch } from "./graph";

/** Runs `fn` and defers every effect it invalidates until it returns, so each runs once. */
export function batch(fn: () => void): void {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
}
