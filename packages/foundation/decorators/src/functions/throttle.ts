import { createMethodDecorator } from "../create-method-decorator";

export function Throttle(ms: number) {
  return createMethodDecorator({
    wrap(original, instance) {
      let last = 0;
      return (...args: unknown[]) => {
        const now = Date.now();
        if (now - last < ms) return;
        last = now;
        return original.apply(instance, args);
      };
    },
  });
}
