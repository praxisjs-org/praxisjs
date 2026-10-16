import { readSignal, signal, SignalNode, writeSignal } from "@praxisjs/core/internal";
import type { Signal } from "@praxisjs/shared";

export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  precision?: number;
}

export interface Spring {
  value: () => number;
  target: Signal<number>;
  stop(): void;
}

export function spring(initial: number, options: SpringOptions = {}): Spring {
  const {
    stiffness = 0.15,
    damping = 0.8,
    mass = 1,
    precision = 0.001,
  } = options;

  if (stiffness <= 0) {
    throw new Error("stiffness must be greater than 0");
  }

  const value = new SignalNode(initial);
  const target = signal(initial);
  let goal = initial;
  let velocity = 0;
  let raf: number | undefined;

  function tick() {
    const current = value.value;
    const force = (goal - current) * stiffness;
    velocity = (velocity + force / mass) * damping;

    const next = current + velocity;

    if (Math.abs(goal - next) > precision || Math.abs(velocity) > precision) {
      writeSignal(value, next);
      raf = requestAnimationFrame(tick);
    } else {
      writeSignal(value, goal);
      velocity = 0;
      raf = undefined;
    }
  }

  // Writes to the target restart the simulation directly: no effect has to watch it, and a value
  // already at rest never schedules a frame.
  const write = target.set.bind(target);
  target.set = (next: number) => {
    if (Object.is(goal, next)) return;
    goal = next;
    write(next);
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };
  target.update = (fn: (prev: number) => number) => {
    target.set(fn(goal));
  };

  return {
    value: () => readSignal(value),
    target,
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = undefined;
    },
  };
}
