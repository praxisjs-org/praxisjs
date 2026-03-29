import { createMethodDecorator } from "../create-method-decorator";

export function Throttle(ms: number) {
  return createMethodDecorator({
    wrap(original, instance) {
      const clampedMs = Math.max(0, ms);
      let last = 0;
      return (...args: unknown[]) => {
        const now = Date.now();
        if (now - last < clampedMs) return;
        last = now;
        return original.apply(instance, args) as unknown;
      };
    },
  });
}
