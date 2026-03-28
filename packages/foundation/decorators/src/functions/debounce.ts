import { createMethodDecorator } from "../create-method-decorator";

export function Debounce(ms: number) {
  return createMethodDecorator({
    wrap(original, instance) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      return (...args: unknown[]) => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = undefined;
          original.apply(instance, args);
        }, ms);
      };
    },
  });
}
