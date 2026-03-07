import { type RootComponent, signal } from "@praxisjs/core/internal";

export function Lazy(placeholder = 200) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => RootComponent>(
    constructor: T,
    _context: ClassDecoratorContext,
  ): T {
    return class LazyWrapper extends constructor {
      private readonly _lazyVisible = signal(false);
      private _observer?: IntersectionObserver;
      private readonly _originalRender: () => Node | Node[] | null =
        this.render.bind(this);

      onMount() {
        super.onMount?.();

        // Use the end anchor to find the parent element
        const el =
          (this as unknown as { _anchor?: Comment })._anchor
            ?.parentElement ?? null;
        if (!el) return;

        if (!("IntersectionObserver" in window)) {
          this._lazyVisible.set(true);
          return;
        }

        if (!this._lazyVisible()) {
          el.style.minHeight = `${String(placeholder)}px`;
        }

        this._observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              this._lazyVisible.set(true);
              el.style.minHeight = "";
              this._observer?.disconnect();
            }
          },
          { rootMargin: "100px" },
        );

        this._observer.observe(el);
      }

      onUnmount() {
        super.onUnmount?.();
        this._observer?.disconnect();
      }

      render(): Node | Node[] | null {
        if (!this._lazyVisible()) return null;
        return this._originalRender();
      }
    } as unknown as T;
  };
}
