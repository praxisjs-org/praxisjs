import { signal, computed, effect } from "@verbose/core";

export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  precision?: number;
}

export function spring(initial: number, options: SpringOptions = {}) {
  const {
    stiffness = 0.15,
    damping = 0.8,
    mass = 1,
    precision = 0.001,
  } = options;

  const _value = signal(initial);
  const _target = signal(initial);
  let velocity = 0;
  let raf: number | undefined;

  function tick() {
    const current = _value();
    const target = _target();
    const force = (target - current) * stiffness;
    velocity = (velocity + force / mass) * damping;

    const next = current + velocity;
    _value.set(next);

    if (Math.abs(target - next) > precision || Math.abs(velocity) > precision) {
      raf = requestAnimationFrame(tick);
    } else {
      _value.set(target);
      velocity = 0;
    }
  }

  effect(() => {
    void _target();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  });

  return {
    value: computed(() => _value()),
    target: _target,
    stop() {
      if (raf) cancelAnimationFrame(raf);
    },
  };
}
