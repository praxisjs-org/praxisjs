export const easings = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - (1 - t) ** 2,
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  easeInCubic: (t: number) => t * t * t,
  bounce: (t: number) => {
    const n1 = 7.5625,
      d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  elastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return (
      -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))
    );
  },
} satisfies Record<string, (t: number) => number>;

export type Easing = keyof typeof easings | ((t: number) => number);

export function resolveEasing(easing: Easing): (t: number) => number {
  return typeof easing === "function" ? easing : easings[easing];
}
