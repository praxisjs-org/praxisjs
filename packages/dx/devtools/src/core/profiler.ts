import {
  setReactiveObserver,
  type ComputedNode,
  type EffectNode,
  type ReactiveNode,
  type ReactiveObserver,
} from "@praxisjs/core/internal";

import { EventBus } from "./event-bus";

export interface OwnerStats {
  /** Constructor name of the component the effects belong to, or "(no component)". */
  name: string;
  effectRuns: number;
  effectMs: number;
  /** Slowest single effect run, in ms. */
  maxMs: number;
}

export interface ProfileSnapshot {
  recording: boolean;
  /** Milliseconds covered by the recording so far. */
  duration: number;
  writes: number;
  effectRuns: number;
  effectMs: number;
  computeRuns: number;
  computeMs: number;
  /** Per component, busiest first. */
  owners: OwnerStats[];
}

const UNOWNED = "(no component)";

/**
 * Records what the reactive graph does while recording: signal writes, computed recomputations
 * and effect runs, with their cost, grouped by the component that created each effect. It installs
 * itself as the graph's observer only while recording, so it costs nothing otherwise.
 */
export class Profiler implements ReactiveObserver {
  readonly bus = new EventBus();

  private recording = false;
  private startedAt = 0;
  private stoppedAt = 0;
  private writes = 0;
  private effectRuns = 0;
  private effectMs = 0;
  private computeRuns = 0;
  private computeMs = 0;
  private readonly byOwner = new Map<object | undefined, OwnerStats>();
  private previous: ReactiveObserver | null = null;
  private notifyScheduled = false;
  private mutedDepth = 0;

  get isRecording(): boolean {
    return this.recording;
  }

  /** Runs `fn` without recording what it causes: the devtools panel updating itself. */
  muted<T>(fn: () => T): T {
    this.mutedDepth++;
    try {
      return fn();
    } finally {
      this.mutedDepth--;
    }
  }

  start(): void {
    if (this.recording) return;
    this.reset();
    this.recording = true;
    this.startedAt = performance.now();
    this.previous = setReactiveObserver(this);
    this.changed();
  }

  stop(): void {
    if (!this.recording) return;
    this.recording = false;
    this.stoppedAt = performance.now();
    setReactiveObserver(this.previous);
    this.previous = null;
    this.changed();
  }

  reset(): void {
    this.writes = 0;
    this.effectRuns = 0;
    this.effectMs = 0;
    this.computeRuns = 0;
    this.computeMs = 0;
    this.byOwner.clear();
    this.startedAt = this.stoppedAt = performance.now();
    this.changed();
  }

  write(_node: ReactiveNode): void {
    if (this.mutedDepth > 0) return;
    this.writes++;
    this.changed();
  }

  compute(_node: ComputedNode, ms: number): void {
    if (this.mutedDepth > 0) return;
    this.computeRuns++;
    this.computeMs += ms;
    this.changed();
  }

  effect(_node: EffectNode, ms: number, owner: object | undefined): void {
    if (this.mutedDepth > 0) return;
    this.effectRuns++;
    this.effectMs += ms;
    let stats = this.byOwner.get(owner);
    if (stats === undefined) {
      stats = { name: owner === undefined ? UNOWNED : owner.constructor.name, effectRuns: 0, effectMs: 0, maxMs: 0 };
      this.byOwner.set(owner, stats);
    }
    stats.effectRuns++;
    stats.effectMs += ms;
    if (ms > stats.maxMs) stats.maxMs = ms;
    this.changed();
  }

  /** Totals plus per-component stats merged by component name, busiest first. */
  snapshot(): ProfileSnapshot {
    const merged = new Map<string, OwnerStats>();
    for (const stats of this.byOwner.values()) {
      const entry = merged.get(stats.name);
      if (entry === undefined) {
        merged.set(stats.name, { ...stats });
      } else {
        entry.effectRuns += stats.effectRuns;
        entry.effectMs += stats.effectMs;
        entry.maxMs = Math.max(entry.maxMs, stats.maxMs);
      }
    }
    return {
      recording: this.recording,
      duration: (this.recording ? performance.now() : this.stoppedAt) - this.startedAt,
      writes: this.writes,
      effectRuns: this.effectRuns,
      effectMs: this.effectMs,
      computeRuns: this.computeRuns,
      computeMs: this.computeMs,
      owners: [...merged.values()].sort((a, b) => b.effectMs - a.effectMs || b.effectRuns - a.effectRuns),
    };
  }

  // Coalesced to one notification per task, so a burst of thousands of effect runs does not
  // make the panel re-render thousands of times.
  private changed(): void {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    setTimeout(() => {
      this.notifyScheduled = false;
      this.bus.emit("profile:changed", null);
    }, 0);
  }
}
