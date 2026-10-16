import { endBatch, readSignal, signal, SignalNode, startBatch, writeSignal } from "@praxisjs/core/internal";
import type { Signal } from "@praxisjs/shared";

import { resolveEasing, type Easing } from "./easings";

export interface TweenOptions {
  duration?: number;
  easing?: Easing;
  delay?: number;
}

export interface Tween {
  value: () => number;
  target: Signal<number>;
  playing: () => boolean;
  progress: () => number;
  stop(): void;
  reset(): void;
}

export function tween(
  from: number,
  to: number,
  options: TweenOptions = {},
): Tween {
  const { duration: rawDuration = 300, easing = "easeOut", delay = 0 } = options;
  const duration = Math.max(1, rawDuration);
  const easeFn = resolveEasing(easing);

  const value = new SignalNode(from);
  const progress = new SignalNode(0);
  const playing = new SignalNode(false);
  const target = signal(to);
  let goal = to;

  let raf: number | undefined;
  let startTime: number | undefined;
  let startValue = from;

  function animate(timestamp: number) {
    startTime ??= timestamp + delay;
    const elapsed = Math.max(0, timestamp - startTime);
    const t = Math.min(elapsed / duration, 1);

    startBatch();
    writeSignal(progress, t);
    if (t < 1) {
      writeSignal(value, startValue + (goal - startValue) * easeFn(t));
      raf = requestAnimationFrame(animate);
    } else {
      writeSignal(value, goal);
      writeSignal(playing, false);
      raf = undefined;
    }
    endBatch();
  }

  function start() {
    if (raf) cancelAnimationFrame(raf);
    startValue = value.value;
    startTime = undefined;
    writeSignal(playing, true);
    raf = requestAnimationFrame(animate);
  }

  function cancel() {
    if (raf) cancelAnimationFrame(raf);
    raf = undefined;
  }

  // Writes to the target start the animation directly: no effect has to watch it, and a value
  // already at its target never schedules a frame.
  const write = target.set.bind(target);
  target.set = (next: number) => {
    if (Object.is(goal, next)) return;
    goal = next;
    write(next);
    start();
  };
  target.update = (fn: (prev: number) => number) => {
    target.set(fn(goal));
  };

  if (!Object.is(from, to)) start();

  return {
    value: () => readSignal(value),
    target,
    playing: () => readSignal(playing),
    progress: () => readSignal(progress),
    stop() {
      cancel();
      writeSignal(playing, false);
    },
    reset() {
      cancel();
      startBatch();
      writeSignal(value, from);
      writeSignal(progress, 0);
      writeSignal(playing, false);
      endBatch();
    },
  };
}
