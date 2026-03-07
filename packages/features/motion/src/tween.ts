import { signal, computed, effect } from "@praxisjs/core/internal";
import type { Computed, Signal } from "@praxisjs/shared";

import { resolveEasing, type Easing } from "./easings";

export interface TweenOptions {
  duration?: number;
  easing?: Easing;
  delay?: number;
}

export interface Tween {
  value: Computed<number>;
  target: Signal<number>;
  playing: Computed<boolean>;
  progress: Computed<number>;
  stop(): void;
  reset(): void;
}

export function tween(
  from: number,
  to: number,
  options: TweenOptions = {},
): Tween {
  const { duration = 300, easing = "easeOut", delay = 0 } = options;
  const easeFn = resolveEasing(easing);

  const _value = signal(from);
  const _target = signal(to);
  const _progress = signal(0);
  const _playing = signal(false);

  let raf: number | undefined;
  let startTime: number | undefined;
  let startValue = from;

  function animate(timestamp: number) {
    startTime ??= timestamp + delay;
    const elapsed = Math.max(0, timestamp - startTime);
    const t = Math.min(elapsed / duration, 1);

    _progress.set(t);
    _value.set(startValue + (_target() - startValue) * easeFn(t));

    if (t < 1) {
      raf = requestAnimationFrame(animate);
    } else {
      _value.set(_target());
      _playing.set(false);
    }
  }

  function start() {
    if (raf) cancelAnimationFrame(raf);
    startValue = _value();
    startTime = undefined;
    _playing.set(true);
    raf = requestAnimationFrame(animate);
  }

  effect(() => {
    void _target();
    start();
  });

  return {
    value: computed(() => _value()),
    target: _target,
    playing: computed(() => _playing()),
    progress: computed(() => _progress()),
    stop() {
      if (raf) cancelAnimationFrame(raf);
      _playing.set(false);
    },
    reset() {
      if (raf) cancelAnimationFrame(raf);
      _value.set(from);
      _progress.set(0);
    },
  };
}
