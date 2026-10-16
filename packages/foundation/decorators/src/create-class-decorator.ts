import type { RootComponent } from "@praxisjs/core/internal";

import { assertMemberKind } from "./field";

type RenderResult = Node | Node[] | null;

export interface ClassEnhancement {
  onMount?(): void;
  onUnmount?(): void;
  render?(originalRender: () => RenderResult): RenderResult;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor = new (...args: any[]) => unknown;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = RootComponent<Record<string, any>>;

/**
 * The behavior a class decorator adds. Every method is optional: hooks that take the instance
 * (`onMount`, `onUnmount`, `render`) live on the behavior itself and allocate nothing per
 * instance; `create` returns a per-instance `ClassEnhancement` when hooks need their own closures.
 */
export abstract class ClassBehavior<Instance extends object = AnyComponent> {
  /** Names the decorator in error messages, e.g. `"@Analytics()"`. */
  label?: string;

  /** Runs once per instance, after its own constructor. */
  create?(instance: Instance): ClassEnhancement;

  /** Runs on every mount of each instance, after the class's own `onMount`. */
  onMount?(instance: Instance): void;

  /** Runs on every unmount of each instance, after the class's own `onUnmount`. */
  onUnmount?(instance: Instance): void;

  /** Wraps every render of each instance; `originalRender` renders the class's own output. */
  render?(instance: Instance, originalRender: () => RenderResult): RenderResult;

  /**
   * Called once after the enhanced class is created.
   * Use this to set static properties on the class constructor itself.
   */
  initialize?(_Enhanced: AnyConstructor, _original: AnyConstructor): void;
}

// Keyed by symbols so they can't collide with the component's own fields.
const ENHANCEMENT: unique symbol = Symbol("praxis.classEnhancement");
// Set on an instance while its render is being called as `originalRender` from within an
// enhancement. While set, the Enhanced render skips the enhancement's render so stacked decorators
// (e.g. @Lazy + another render-overriding decorator) don't re-enter the outermost one recursively.
const IN_ORIGINAL_RENDER: unique symbol = Symbol("praxis.inOriginalRender");

const NO_ENHANCEMENT: ClassEnhancement = Object.freeze({});

type Render = (...args: unknown[]) => RenderResult;

interface EnhancedHost {
  [ENHANCEMENT]: ClassEnhancement;
  [IN_ORIGINAL_RENDER]?: boolean;
}

/**
 * Builds a class decorator from a `ClassBehavior`. The class is extended by a subclass that runs
 * the behavior's hooks; a behavior with only `initialize` leaves the class as it is.
 */
export function createClassDecorator<Instance extends object = AnyComponent>(behavior: ClassBehavior<Instance>) {
  const label = behavior.label ?? "This class decorator";
  return function <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends new (...args: any[]) => Instance,
  >(constructor: T, context: ClassDecoratorContext): T {
    assertMemberKind(context, "class", label);
    const hasCreate = behavior.create !== undefined;
    const sharedRender = behavior.render !== undefined;
    if (!hasCreate && !sharedRender && behavior.onMount === undefined && behavior.onUnmount === undefined) {
      behavior.initialize?.(constructor, constructor);
      return constructor;
    }

    const original = (constructor.prototype as { render?: Render }).render;

    const Enhanced = class extends (constructor as unknown as new (...args: unknown[]) => RootComponent) {
      readonly [ENHANCEMENT]: ClassEnhancement = hasCreate
        ? (behavior as Required<Pick<ClassBehavior<Instance>, "create">>).create(this as unknown as Instance)
        : NO_ENHANCEMENT;

      onMount() {
        super.onMount?.();
        behavior.onMount?.(this as unknown as Instance);
        this[ENHANCEMENT].onMount?.();
      }

      onUnmount() {
        super.onUnmount?.();
        behavior.onUnmount?.(this as unknown as Instance);
        this[ENHANCEMENT].onUnmount?.();
      }

      render(...args: unknown[]): RenderResult {
        const render = original as Render;
        const host = this as unknown as EnhancedHost;
        const enhancement = host[ENHANCEMENT];
        if ((!sharedRender && enhancement.render === undefined) || host[IN_ORIGINAL_RENDER] === true) {
          return render.apply(this, args);
        }
        const renderOriginal = (): RenderResult => {
          host[IN_ORIGINAL_RENDER] = true;
          try {
            return render.apply(this, args);
          } finally {
            host[IN_ORIGINAL_RENDER] = false;
          }
        };
        const inner =
          enhancement.render === undefined
            ? renderOriginal
            : () => (enhancement as Required<ClassEnhancement>).render(renderOriginal);
        if (!sharedRender) return inner();
        return (behavior as Required<Pick<ClassBehavior<Instance>, "render">>).render(this as unknown as Instance, inner);
      }
    };

    // If the original class has no render, remove the wrapper so instances see `undefined`.
    if (typeof original !== "function") {
      delete (Enhanced.prototype as { render?: unknown }).render;
    }

    Object.defineProperty(Enhanced, "name", { value: constructor.name });
    behavior.initialize?.(Enhanced, constructor);
    return Enhanced as unknown as T;
  };
}
