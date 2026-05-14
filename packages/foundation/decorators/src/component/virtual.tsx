import {
  computed,
  effect,
  type RootComponent,
  signal,
} from "@praxisjs/core/internal";

import {
  ClassBehavior,
  createClassDecorator,
  type ClassEnhancement,
} from "../create-class-decorator";

interface VirtualHost {
  _anchor?: Comment;
  items?: unknown[];
  renderItem(item: unknown, index: number): Node | Node[] | null;
}

class VirtualBehavior extends ClassBehavior {
  constructor(
    private readonly itemHeight: number,
    private readonly buffer: number,
  ) {
    super();
  }

  create(instance: RootComponent): ClassEnhancement {
    const { itemHeight, buffer } = this;
    const host = instance as unknown as VirtualHost;
    const scrollTop = signal(0);
    const viewHeight = signal(600);
    let container: HTMLElement | undefined;
    let scrollHandler: (() => void) | undefined;
    const cleanups: Array<() => void> = [];

    return {
      onMount() {
        if (itemHeight <= 0) {
          throw new Error(
            `[Virtual] itemHeight must be a positive number, got ${String(itemHeight)}`,
          );
        }
        container = host._anchor?.parentElement ?? undefined;
        if (!container) return;

        container.style.overflowY = "auto";
        container.style.position = "relative";
        viewHeight.set(container.clientHeight || 600);

        const currentContainer = container;
        scrollHandler = () => {
          scrollTop.set(currentContainer.scrollTop);
        };
        container.addEventListener("scroll", scrollHandler);
      },

      onUnmount() {
        if (container && scrollHandler) {
          container.removeEventListener("scroll", scrollHandler);
        }
        cleanups.forEach((c) => {
          c();
        });
        cleanups.length = 0;
      },

      render(originalRender) {
        const items = host.items ?? [];
        const total = items.length;
        const totalH = total * itemHeight;

        if (typeof host.renderItem !== "function") {
          console.warn(
            `[Virtual] component must implement renderItem(item, index)`,
          );
          return originalRender();
        }

        const renderItem = host.renderItem.bind(host);

        const startIdx = computed(() =>
          Math.max(0, Math.floor(scrollTop() / itemHeight) - buffer),
        );
        const endIdx = computed(() =>
          Math.min(
            total - 1,
            Math.ceil((scrollTop() + viewHeight()) / itemHeight) + buffer,
          ),
        );
        const visibleItems = computed(() => {
          const result: Array<{ item: unknown; index: number }> = [];
          for (let i = startIdx(); i <= endIdx(); i++) {
            result.push({ item: items[i], index: i });
          }
          return result;
        });
        const offsetTop = computed(() => startIdx() * itemHeight);
        const offsetBottom = computed(
          () => (total - 1 - endIdx()) * itemHeight,
        );

        const outer = document.createElement("div");
        outer.setAttribute(
          "style",
          `height:${String(totalH)}px; position:relative;`,
        );

        const spacerTop = document.createElement("div");
        cleanups.push(
          effect(() => {
            spacerTop.setAttribute("style", `height:${String(offsetTop())}px;`);
          }),
        );

        const itemsSlot = document.createElement("div");
        cleanups.push(
          effect(() => {
            while (itemsSlot.firstChild)
              itemsSlot.removeChild(itemsSlot.firstChild);
            visibleItems().forEach(({ item, index }) => {
              const wrapper = document.createElement("div");
              wrapper.setAttribute(
                "style",
                `height:${String(itemHeight)}px; overflow:hidden;`,
              );
              const rendered = renderItem(item, index);
              if (rendered) {
                (Array.isArray(rendered)
                  ? rendered.flat()
                  : [rendered]
                ).forEach((n) => {
                  wrapper.appendChild(n);
                });
              }
              itemsSlot.appendChild(wrapper);
            });
          }),
        );

        const spacerBottom = document.createElement("div");
        cleanups.push(
          effect(() => {
            spacerBottom.setAttribute(
              "style",
              `height:${String(offsetBottom())}px;`,
            );
          }),
        );

        outer.appendChild(spacerTop);
        outer.appendChild(itemsSlot);
        outer.appendChild(spacerBottom);

        return outer;
      },
    };
  }
}

export function Virtual(itemHeight: number, buffer = 3) {
  return createClassDecorator(new VirtualBehavior(itemHeight, buffer));
}
