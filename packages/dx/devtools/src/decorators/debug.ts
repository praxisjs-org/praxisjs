import { computed } from "@praxisjs/core/internal";

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
    typeof (value as unknown as Record<string, unknown>).subscribe ===
      "function" &&
    !("set" in (value as object))
  );
}

interface ComputedSlot {
  computed: TrackedComputed;
  unsub: () => void;
}

interface DebugDecorator {
  (
    value: (...args: unknown[]) => unknown,
    context: ClassMethodDecoratorContext,
  ): (...args: unknown[]) => unknown;
  (value: unknown, context: ClassGetterDecoratorContext): void;
  (value: undefined, context: ClassFieldDecoratorContext): void;
}

/**
 * Tracks state, computed values, and methods in the devtools panel.
 *
 * On @State() properties (stacked):
 *   @Debug()
 *   @State() count = 0;
 *
 * On @Computed() getters (stacked):
 *   @Debug({ label: "doubled" })
 *   @Computed()
 *   get doubled() { return this.count * 2; }
 *
 * On methods:
 *   @Debug()
 *   increment() { ... }
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

    // ── Method decorator ─────────────────────────────────────────────────
    if (context.kind === "method") {
      const original = value as (...args: unknown[]) => unknown;

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
            this,
            label,
            args,
            threw ? `throw ${String(result)}` : result,
            duration,
            componentName,
          );
        }

        return result;
      };
    }

    // ── Getter decorator (@Computed() getters) ────────────────────────────
    if (context.kind === "getter") {
      const originalGetter = value as (this: object) => unknown;

      context.addInitializer(function (this: unknown) {
        const instance = this as object & Record<string, unknown>;
        const componentName = (instance.constructor as { name: string }).name;

        // Defer until the current synchronous class initialization (including
        // field initializers like `count = 0`) has fully completed. Without
        // this, accessing `this.doubled` here could read state signals before
        // their field initializers have run, producing NaN or undefined.
        queueMicrotask(() => {
          const c = computed(() => originalGetter.call(instance));
          let skipFirst = true;
          let prevValue = c();

          Registry.instance.registerSignal(instance, label, prevValue, componentName);

          c.subscribe((newValue) => {
            if (skipFirst) {
              skipFirst = false;
              return;
            }
            Registry.instance.updateSignal(instance, label, newValue, prevValue);
            prevValue = newValue;
          });
        });
      });

      return;
    }

    // ── Field decorator ───────────────────────────────────────────────────
    context.addInitializer(function (
      this: unknown,
    ) {
        const instance = this as object & Record<string, unknown>;
        const name = context.name as string;
        const componentName = (
          instance.constructor as { name: string }
        ).name;

        // ── Wrapping @State() getter/setter ─────────────────────────────
        // @State() initializer runs before @Debug() initializer (inner-first),
        // so the getter/setter is already installed on the instance here.
        const existingDesc = Object.getOwnPropertyDescriptor(instance, name);

        if (existingDesc?.get && existingDesc.set) {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          const originalGet = existingDesc.get;
          // eslint-disable-next-line @typescript-eslint/unbound-method
          const originalSet = existingDesc.set;

          Registry.instance.registerSignal(
            instance,
            label,
            originalGet.call(instance),
            componentName,
          );

          Object.defineProperty(instance, name, {
            get(this: object) {
              return originalGet.call(this) as unknown;
            },
            set(this: object, newValue: unknown) {
              const oldValue: unknown = originalGet.call(this);
              originalSet.call(this, newValue);
              Registry.instance.updateSignal(this, label, newValue, oldValue);
            },
            enumerable: true,
            configurable: true,
          });

          return;
        }

        // ── Computed class field ─────────────────────────────────────────
        // The field initializer has already run, so read the assigned value.
        const initialValue = instance[name];
        Reflect.deleteProperty(instance, name);

        if (!isComputed(initialValue)) {
          if (initialValue !== undefined) {
            console.warn(
              `[PraxisJS DevTools] @Debug() on "${componentName}.${name}": ` +
                `expected a computed() value but got ${typeof initialValue}. Skipping.`,
            );
          }
          instance[name] = initialValue;
          return;
        }

        // subscribe() calls the callback immediately (synchronously), so we
        // use a flag to skip the first call and register via registerSignal instead.
        let slot: ComputedSlot;

        function subscribe(computed: TrackedComputed): () => void {
          let skipFirst = true;
          let prevValue = computed();

          const unsub = computed.subscribe((newValue) => {
            if (skipFirst) {
              skipFirst = false;
              return;
            }
            Registry.instance.updateSignal(instance, label, newValue, prevValue);
            prevValue = newValue;
          });

          Registry.instance.registerSignal(instance, label, prevValue, componentName);
          return unsub;
        }

        slot = { computed: initialValue, unsub: subscribe(initialValue) };

        Object.defineProperty(instance, name, {
          get() {
            return slot.computed;
          },
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
          enumerable: true,
          configurable: true,
        });
    });
  };

  return impl as DebugDecorator;
}
