import { createMethodDecorator } from "../create-method-decorator";

export function Once() {
  return createMethodDecorator({
    wrap(original, instance) {
      let called = false;
      let result: unknown;
      return (...args: unknown[]) => {
        if (called) return result;
        result = original.apply(instance, args);
        called = true;
        return result;
      };
    },
  });
}
