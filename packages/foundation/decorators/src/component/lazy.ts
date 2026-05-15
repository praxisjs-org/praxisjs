import { type RootComponent, signal } from "@praxisjs/core/internal";

import { ClassBehavior, createClassDecorator, type ClassEnhancement } from "../create-class-decorator";

export interface LazyOptions {
  /** Placeholder height in pixels while the component is off-screen. */
  placeholder?: number;
  /**
   * Scroll container to observe against. Defaults to the viewport (`null`).
   * Pass a ref object `{ current: HTMLElement | null }` to scope intersection
   * to a specific scrollable container.
   */
  root?: { current: HTMLElement | null } | null;
  /** Extra margin around the root before triggering (e.g. `"200px"`). Defaults to `"100px"`. */
  rootMargin?: string;
}

class LazyBehavior extends ClassBehavior {
  constructor(private readonly options: LazyOptions) {
    super();
  }

  create(instance: RootComponent): ClassEnhancement {
    const { placeholder = 200, root, rootMargin = "100px" } = this.options;
    const visible = signal(false);
    let observer: IntersectionObserver | undefined;

    return {
      onMount() {
        const el =
          (instance as { _anchor?: Comment })._anchor?.parentElement ?? null;
        if (!el) return;

        if (!("IntersectionObserver" in window)) {
          visible.set(true);
          return;
        }

        if (!visible()) el.style.minHeight = `${String(placeholder)}px`;

        const rootEl =
          root === undefined || root === null ? null : root.current ?? null;

        observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              visible.set(true);
              el.style.minHeight = "";
              observer?.disconnect();
            }
          },
          { root: rootEl, rootMargin },
        );

        observer.observe(el);
      },

      onUnmount() {
        observer?.disconnect();
      },

      render(originalRender) {
        return (() => {
          if (!visible()) return null;
          return originalRender();
        }) as unknown as Node;
      },
    };
  }
}

export function Lazy(placeholderOrOptions: number | LazyOptions = 200) {
  const options: LazyOptions =
    typeof placeholderOrOptions === "number"
      ? { placeholder: placeholderOrOptions }
      : placeholderOrOptions;
  return createClassDecorator(new LazyBehavior(options));
}
