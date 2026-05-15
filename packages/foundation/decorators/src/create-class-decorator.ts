import type { RootComponent } from "@praxisjs/core/internal";

export interface ClassEnhancement {
  onMount?(): void;
  onUnmount?(): void;
  render?(
    originalRender: () => Node | Node[] | null,
  ): Node | Node[] | null;
}

export abstract class ClassBehavior {
  abstract create(instance: RootComponent): ClassEnhancement;

  /**
   * Called once after the enhanced class is created.
   * Use this to set static properties on the class constructor itself.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialize?(_Enhanced: new (...args: any[]) => unknown, _original: new (...args: any[]) => unknown): void;
}

// Tracks instances whose render is currently being called as `originalRender`
// from within an enhancement. When set, the Enhanced render skips the
// this._enh.render dispatch so stacked decorators (e.g. @Lazy + @Component)
// don't re-enter the outermost enhancement recursively.
const _originalRenderInProgress = new WeakSet();

export function createClassDecorator(behavior: ClassBehavior) {
  return function <
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends new (...args: any[]) => RootComponent<Record<string, any>>,
  >(constructor: T, _context: ClassDecoratorContext): T {
    const Enhanced = class extends constructor {
      private readonly _enh: ClassEnhancement = behavior.create(
        this as unknown as RootComponent,
      );

      onMount() {
        super.onMount?.();
        this._enh.onMount?.();
      }

      onUnmount() {
        super.onUnmount?.();
        this._enh.onUnmount?.();
      }

      render(...args: unknown[]): Node | Node[] | null {
        const originalRender = () => {
          _originalRenderInProgress.add(this);
          try {
            return (constructor.prototype as { render: (...a: unknown[]) => Node | Node[] | null }).render.apply(this, args);
          } finally {
            _originalRenderInProgress.delete(this);
          }
        };
        if (this._enh.render && !_originalRenderInProgress.has(this)) {
          return this._enh.render(originalRender);
        }
        return (constructor.prototype as { render: (...a: unknown[]) => Node | Node[] | null }).render.apply(this, args);
      }
    };

    // If the original class has no render, remove the wrapper so instances see `undefined`.
    if (typeof (constructor.prototype as { render?: unknown }).render !== "function") {
      delete (Enhanced.prototype as { render?: unknown }).render;
    }

    Object.defineProperty(Enhanced, "name", { value: constructor.name });
    behavior.initialize?.(Enhanced, constructor);
    return Enhanced as unknown as T;
  };
}
