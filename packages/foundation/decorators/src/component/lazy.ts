import { type RootComponent, signal } from "@praxisjs/core/internal";

import { ClassBehavior, createClassDecorator, type ClassEnhancement } from "../create-class-decorator";

class LazyBehavior extends ClassBehavior {
  constructor(private readonly placeholder: number) {
    super();
  }

  create(instance: RootComponent): ClassEnhancement {
    const placeholder = this.placeholder;
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

        observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              visible.set(true);
              el.style.minHeight = "";
              observer?.disconnect();
            }
          },
          { rootMargin: "100px" },
        );

        observer.observe(el);
      },

      onUnmount() {
        observer?.disconnect();
      },

      render(originalRender) {
        if (!visible()) return null;
        return originalRender();
      },
    };
  }
}

export function Lazy(placeholder = 200) {
  return createClassDecorator(new LazyBehavior(placeholder));
}
