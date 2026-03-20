import { computed, effect, type RootComponent, signal } from "@praxisjs/core/internal";

interface VirtualHost {
  _anchor?: Comment;
  items?: unknown[];
  renderItem(item: unknown, index: number): Node | Node[] | null;
}

export function Virtual(itemHeight: number, buffer = 3) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => RootComponent<Record<string, any>>>(
    constructor: T,
    _context: ClassDecoratorContext,
  ): T {
    return class VirtualWrapper extends constructor {
      private readonly _scrollTop = signal(0);
      private readonly _viewHeight = signal(600);
      private _container?: HTMLElement;
      private _scrollHandler?: () => void;
      private _cleanups: Array<() => void> = [];

      onMount() {
        super.onMount?.();

        // Use the end anchor set by the runtime to locate the parent element
        this._container =
          (this as unknown as VirtualHost)._anchor?.parentElement ?? undefined;

        if (!this._container) return;

        this._container.style.overflowY = "auto";
        this._container.style.position = "relative";

        this._viewHeight.set(this._container.clientHeight || 600);

        this._scrollHandler = () => {
          if (this._container) this._scrollTop.set(this._container.scrollTop);
        };

        this._container.addEventListener("scroll", this._scrollHandler);
      }

      onUnmount() {
        super.onUnmount?.();
        if (this._container && this._scrollHandler) {
          this._container.removeEventListener("scroll", this._scrollHandler);
        }
        this._cleanups.forEach((c) => { c(); });
        this._cleanups = [];
      }

      render() {
        const host = this as unknown as VirtualHost;
        const items = host.items ?? [];
        const total = items.length;
        const totalH = total * itemHeight;

        if (typeof host.renderItem !== "function") {
          console.warn(
            `[Virtual] ${constructor.name} must implement renderItem(item, index)`,
          );
          return null;
        }

        const renderItem = host.renderItem.bind(host);

        const startIdx = computed(() => {
          const start = Math.floor(this._scrollTop() / itemHeight) - buffer;
          return Math.max(0, start);
        });

        const endIdx = computed(() => {
          const end =
            Math.ceil((this._scrollTop() + this._viewHeight()) / itemHeight) +
            buffer;
          return Math.min(total - 1, end);
        });

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
        this._cleanups.push(
          effect(() => {
            spacerTop.setAttribute("style", `height:${String(offsetTop())}px;`);
          }),
        );

        const itemsSlot = document.createElement("div");
        this._cleanups.push(
          effect(() => {
            while (itemsSlot.firstChild) {
              itemsSlot.removeChild(itemsSlot.firstChild);
            }
            visibleItems().forEach(({ item, index }) => {
              const wrapper = document.createElement("div");
              wrapper.setAttribute(
                "style",
                `height:${String(itemHeight)}px; overflow:hidden;`,
              );
              const rendered = renderItem(item, index);
              if (rendered) {
                const nodes = (
                  Array.isArray(rendered) ? rendered.flat() : [rendered]
                );
                nodes.forEach((n) => wrapper.appendChild(n));
              }
              itemsSlot.appendChild(wrapper);
            });
          }),
        );

        const spacerBottom = document.createElement("div");
        this._cleanups.push(
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
      }
    } as unknown as T;
  };
}
