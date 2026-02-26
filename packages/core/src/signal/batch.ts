import { track, activeEffect, type Effect } from "./effect";

let batchQueue: Set<Effect> | null = null;

export function batch(fn: () => void) {
  batchQueue = new Set();
  try {
    fn();
  } finally {
    const effectsToRun = batchQueue;
    batchQueue = null;
    effectsToRun?.forEach((eff) => eff());
  }
}
