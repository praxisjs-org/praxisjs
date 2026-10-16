import {
  getComponentAnchor,
  readSignal,
  type RootComponent,
  SignalNode,
  writeSignal,
} from "@praxisjs/core/internal";

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

// One object per instance whose methods live on the prototype, instead of three closures.
class LazyEnhancement implements ClassEnhancement {
  private readonly visible = new SignalNode(false);
  private observer: IntersectionObserver | undefined = undefined;

  constructor(
    private readonly instance: RootComponent,
    private readonly options: LazyOptions,
  ) {}

  onMount(): void {
    const el = getComponentAnchor(this.instance)?.parentElement ?? null;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      writeSignal(this.visible, true);
      return;
    }

    const { placeholder = 200, root, rootMargin = "100px" } = this.options;
    if (!this.visible.value) el.style.minHeight = `${String(placeholder)}px`;

    const rootEl =
      root === undefined || root === null ? null : root.current ?? null;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          writeSignal(this.visible, true);
          el.style.minHeight = "";
          this.observer?.disconnect();
        }
      },
      { root: rootEl, rootMargin },
    );

    this.observer.observe(el);
  }

  onUnmount(): void {
    this.observer?.disconnect();
  }

  render(originalRender: () => Node | Node[] | null): Node | Node[] | null {
    return (() => {
      if (!readSignal(this.visible)) return null;
      return originalRender();
    }) as unknown as Node;
  }
}

class LazyBehavior extends ClassBehavior {
  constructor(private readonly options: LazyOptions) {
    super();
  }

  create(instance: RootComponent): ClassEnhancement {
    return new LazyEnhancement(instance, this.options);
  }
}

export function Lazy(placeholderOrOptions: number | LazyOptions = 200) {
  const options: LazyOptions =
    typeof placeholderOrOptions === "number"
      ? { placeholder: placeholderOrOptions }
      : placeholderOrOptions;
  return createClassDecorator(new LazyBehavior(options));
}
