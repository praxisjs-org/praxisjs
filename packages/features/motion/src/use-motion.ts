import { resolveEasing, type Easing } from "./easings";

export interface MotionKeyframes {
  opacity?: [number, number];
  x?: [number, number];
  y?: [number, number];
  scale?: [number, number];
  rotate?: [number, number];
  duration?: number;
  easing?: Easing;
  delay?: number;
  onComplete?: () => void;
}

export function useMotion(ref: { current: HTMLElement | null }) {
  function animate(keyframes: MotionKeyframes): () => void {
    const el: HTMLElement | null = ref.current;
    if (!el) return () => undefined;
    const safeEl = el;

    const {
      opacity,
      x,
      y,
      scale,
      rotate,
      duration = 300,
      easing = "easeOut",
      delay = 0,
      onComplete,
    } = keyframes;
    const easeFn = resolveEasing(easing);
    let raf: number | undefined;
    let startTime: number | undefined;
    let cancelled = false;

    function frame(ts: number) {
      if (cancelled) return;
      startTime ??= ts + delay;
      const elapsed = Math.max(0, ts - startTime);
      const t = Math.min(elapsed / duration, 1);
      const e = easeFn(t);

      const transforms: string[] = [];
      if (x)
        transforms.push(`translateX(${String(x[0] + (x[1] - x[0]) * e)}px)`);
      if (y)
        transforms.push(`translateY(${String(y[0] + (y[1] - y[0]) * e)}px)`);
      if (scale)
        transforms.push(
          `scale(${String(scale[0] + (scale[1] - scale[0]) * e)})`,
        );
      if (rotate)
        transforms.push(
          `rotate(${String(rotate[0] + (rotate[1] - rotate[0]) * e)}deg)`,
        );

      if (transforms.length) safeEl.style.transform = transforms.join(" ");
      if (opacity)
        safeEl.style.opacity = String(
          opacity[0] + (opacity[1] - opacity[0]) * e,
        );

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        onComplete?.();
      }
    }

    raf = requestAnimationFrame(frame);
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }

  return {
    animate,
    enter: (kf: MotionKeyframes) => animate(kf),
    exit: (kf: MotionKeyframes) =>
      animate({
        ...kf,
        opacity: kf.opacity ? [kf.opacity[1], kf.opacity[0]] : undefined,
        x: kf.x ? [kf.x[1], kf.x[0]] : undefined,
        y: kf.y ? [kf.y[1], kf.y[0]] : undefined,
      }),
  };
}
