import { type FieldDecorator, type FieldHost, sharedField } from "../field";

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
export function Ref<T extends Element = Element>(): FieldDecorator {
  return sharedField((name) => {
    const ref = Symbol(`praxis.ref.${name}`);
    return {
      descriptor: {
        // Created on first read: a ref that is never handed to an element costs nothing.
        get(this: FieldHost) {
          return (this[ref] ??= createRef<T>());
        },
      },
    };
  });
}
