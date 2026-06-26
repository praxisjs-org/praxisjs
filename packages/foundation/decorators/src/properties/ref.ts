import { createFieldDecorator } from "../create-field-decorator";

export type Ref<T extends Element = Element> = ((el: T | null) => void) & {
  current: T | null;
};

/** Creates a standalone ref object for use outside of class fields (e.g. module-level or passed to @Lazy). */
 
export function createRef<T extends Element = Element>(): Ref<T> {
  function refFn(el: T | null): void {
    (refFn as Ref<T>).current = el;
  }
  (refFn as Ref<T>).current = null;
  return refFn as Ref<T>;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function Ref<T extends Element = Element>() {
  return createFieldDecorator({
    bind(_instance, _name, _initialValue) {
      const ref = createRef<T>();
      return {
        descriptor: { get: () => ref },
      };
    },
  });
}
