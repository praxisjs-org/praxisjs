import { computed } from "@praxisjs/core/internal";
import {
  createMethodDecorator,
  createGetterObserverDecorator,
  createFieldDecorator,
  type FieldBinding,
} from "@praxisjs/decorators";

import { Registry } from "../core/registry";

export interface DebugOptions {
  label?: string;
}

// Duck-type check: callable with .subscribe but no .set → Computed
interface TrackedComputed {
  (): unknown;
  subscribe: (fn: (value: unknown) => void) => () => void;
}

function isComputed(value: unknown): value is TrackedComputed {
  return (
    typeof value === "function" &&
    typeof (value as unknown as Record<string, unknown>).subscribe === "function" &&
    !("set" in (value as object))
  );
}

interface ComputedSlot {
  computed: TrackedComputed;
  unsub: () => void;
}

interface DebugDecorator {
  (value: (...args: unknown[]) => unknown, context: ClassMethodDecoratorContext): void;
  (value: unknown, context: ClassGetterDecoratorContext): void;
  (value: undefined, context: ClassFieldDecoratorContext): void;
}

/**
 * Tracks state, computed values, and methods in the devtools panel.
 * Supports @State() fields, @Computed() getters, and methods.
 */
export function Debug(options: DebugOptions = {}): DebugDecorator {
  const impl = function (
    value: unknown,
    context:
      | ClassMethodDecoratorContext
      | ClassGetterDecoratorContext
      | ClassFieldDecoratorContext,
  ) {
    const label = options.label ?? (context.name as string);

    if (context.kind === "method") {
      const original = value as (...args: unknown[]) => unknown;
      createMethodDecorator({
        wrap(_original, _instance, _name) {
          return function (this: object, ...args: unknown[]) {
            const componentName = (this.constructor as { name: string }).name;
            const start = performance.now();
            let result: unknown;
            let threw = false;
            try {
              result = original.apply(this, args);
            } catch (err) {
              threw = true;
              result = err;
              throw err;
            } finally {
              const duration = performance.now() - start;
              Registry.instance.recordMethodCall(
                this, label, args,
                threw ? `throw ${String(result)}` : result,
                duration, componentName,
              );
            }
            return result;
          };
        },
      })(original, context);
      return;
    }

    if (context.kind === "getter") {
      const originalGetter = value as (this: object) => unknown;
      createGetterObserverDecorator({
        observe(getter, instance, _name) {
          const componentName = (instance.constructor as { name: string }).name;
          // Defer so field initializers (e.g. @State()) have run before we read them.
          queueMicrotask(() => {
            const c = computed(() => getter.call(instance));
            let skipFirst = true;
            let prevValue = c();
            Registry.instance.registerSignal(instance, label, prevValue, componentName);
            c.subscribe((newValue) => {
              if (skipFirst) { skipFirst = false; return; }
              Registry.instance.updateSignal(instance, label, newValue, prevValue);
              prevValue = newValue;
            });
          });
        },
      })(originalGetter, context);
      return;
    }

    createFieldDecorator({
      bind(instance, name, _initialValue): FieldBinding {
        const componentName = (instance.constructor as { name: string }).name;

        // @State() runs inner-first, so its getter/setter is already on the instance.
        const existingDesc = Object.getOwnPropertyDescriptor(instance, name);
        if (existingDesc?.get && existingDesc.set) {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          const originalGet = existingDesc.get;
          // eslint-disable-next-line @typescript-eslint/unbound-method
          const originalSet = existingDesc.set;
          Registry.instance.registerSignal(instance, label, originalGet.call(instance), componentName);
          return {
            descriptor: {
              get(this: object) { return originalGet.call(this) as unknown; },
              set(this: object, newValue: unknown) {
                const oldValue: unknown = originalGet.call(this);
                originalSet.call(this, newValue);
                Registry.instance.updateSignal(this, label, newValue, oldValue);
              },
            },
          };
        }

        const initialValue = _initialValue;
        if (!isComputed(initialValue)) {
          if (initialValue !== undefined) {
            console.warn(
              `[PraxisJS DevTools] @Debug() on "${componentName}.${name}": ` +
                `expected a computed() value but got ${typeof initialValue}. Skipping.`,
            );
          }
          return {};
        }

        let slot: ComputedSlot;

        // subscribe() fires the callback immediately — skip that first call
        // and register the initial value via registerSignal instead.
        function subscribe(comp: TrackedComputed): () => void {
          let skipFirst = true;
          let prevValue = comp();
          const unsub = comp.subscribe((newValue) => {
            if (skipFirst) { skipFirst = false; return; }
            Registry.instance.updateSignal(instance, label, newValue, prevValue);
            prevValue = newValue;
          });
          Registry.instance.registerSignal(instance, label, prevValue, componentName);
          return unsub;
        }

        slot = { computed: initialValue, unsub: subscribe(initialValue) };

        return {
          descriptor: {
            get() { return slot.computed; },
            set(newValue: unknown) {
              slot.unsub();
              if (!isComputed(newValue)) {
                console.warn(
                  `[PraxisJS DevTools] @Debug() on "${componentName}.${name}": ` +
                    `expected a computed() value but got ${typeof newValue}. Skipping.`,
                );
                return;
              }
              slot = { computed: newValue, unsub: subscribe(newValue) };
            },
          },
        };
      },
    })(undefined, context);
  };

  return impl as DebugDecorator;
}
