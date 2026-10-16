import { computed, effect, untrack } from "@praxisjs/core/internal";
import {
  createMethodDecorator,
  createGetterObserverDecorator,
  createFieldDecorator,
  type FieldBinding,
} from "@praxisjs/decorators";

import { Registry } from "../core/registry";

// Read inline (not through a helper): bundlers replace process.env.NODE_ENV at build time, and only a
// literal check lets them drop the instrumentation, and the registry it uses, from production builds.
declare const process: { env: { NODE_ENV?: string } };

export interface DebugOptions {
  /** Name shown in the panel. Defaults to the member name. */
  label?: string;
  /**
   * Also logs every change (fields, getters) or call (methods) to the console. `"trace"` logs with
   * a stack trace, which shows what caused it.
   */
  log?: boolean | "trace";
  /**
   * Pauses in the debugger on a change or call. A function decides per change: it receives the new
   * and the previous value (for methods, the arguments and `undefined`).
   */
  break?: boolean | ((next: unknown, prev: unknown) => boolean);
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

function componentNameOf(instance: object): string {
  return (instance.constructor as { name: string }).name;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** Console logging and debugger pauses requested through the options. */
function makeReporter(options: DebugOptions) {
  const { log, break: pause } = options;
  if (!log && !pause) return null;
  return (what: string, next: unknown, prev: unknown): void => {
    untrack(() => {
      if (log === "trace") console.trace(`[PraxisJS] ${what}`, next, prev);
      else if (log) console.log(`[PraxisJS] ${what}`, next, prev);
      if (pause === true || (typeof pause === "function" && pause(next, prev))) {
        debugger;
      }
    });
  };
}

/**
 * Tracks state, props, computed values and methods in the devtools panel.
 *
 * - Fields with an accessor (`@State`, `@Prop`, `@Persisted`, …) are observed reactively, so a
 *   change is reported whatever caused it, including a parent passing a new prop.
 * - Fields holding a `computed()` report each new value.
 * - `@Computed()` getters report each new value.
 * - Methods report every call with its arguments, result and duration; for a method that returns a
 *   promise, when the promise settles.
 */
export function Debug(options: DebugOptions = {}): DebugDecorator {
  // Production builds keep the member exactly as declared: no wrapper, no observation.
  if (process.env.NODE_ENV === "production") return (() => undefined) as DebugDecorator;
  const report = makeReporter(options);

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
            const componentName = componentNameOf(this);
            report?.(`${componentName}.${label}()`, args, undefined);
            const start = performance.now();
            const record = (result: unknown): void => {
              Registry.instance.recordMethodCall(
                this, label, args, result, performance.now() - start, componentName,
              );
            };
            let result: unknown;
            try {
              result = original.apply(this, args);
            } catch (err) {
              record(`throw ${String(err)}`);
              throw err;
            }
            if (isThenable(result)) {
              result.then(
                (resolved) => { record(resolved); },
                (err: unknown) => { record(`reject ${String(err)}`); },
              );
            } else {
              record(result);
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
          const componentName = componentNameOf(instance);
          // Defer so field initializers (e.g. @State()) have run before we read them.
          queueMicrotask(() => {
            const c = computed(() => getter.call(instance));
            let skipFirst = true;
            let prevValue = c();
            Registry.instance.registerSignal(instance, label, prevValue, componentName);
            c.subscribe((newValue) => {
              if (skipFirst) { skipFirst = false; return; }
              Registry.instance.updateSignal(instance, label, newValue, prevValue);
              report?.(`${componentName}.${label}`, newValue, prevValue);
              prevValue = newValue;
            });
          });
        },
      })(originalGetter, context);
      return;
    }

    createFieldDecorator({
      bind(instance, name, _initialValue): FieldBinding {
        const componentName = componentNameOf(instance);

        // @State(), @Prop() and friends run inner-first, so their accessor is already on the
        // instance. Reading it in an effect reports every change, whoever made it.
        const existingDesc = Object.getOwnPropertyDescriptor(instance, name);
        if (existingDesc?.get !== undefined) {
          const read = (): unknown => (instance as unknown as Record<string, unknown>)[name];
          let prev: unknown;
          let first = true;
          const stop = effect(() => {
            const next = read();
            if (first) {
              first = false;
              prev = next;
              untrack(() => { Registry.instance.registerSignal(instance, label, next, componentName); });
              return;
            }
            if (Object.is(next, prev)) return;
            const old = prev;
            prev = next;
            untrack(() => { Registry.instance.updateSignal(instance, label, next, old); });
            report?.(`${componentName}.${label}`, next, old);
          });
          return { onUnmount: stop };
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
            report?.(`${componentName}.${label}`, newValue, prevValue);
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
          onUnmount() { slot.unsub(); },
        };
      },
    })(undefined, context);
  };

  return impl as DebugDecorator;
}
