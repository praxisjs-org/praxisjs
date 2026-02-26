import { type BaseComponent, computed, signal } from "@verbose/core";
import type { VNode } from "@verbose/shared";

export function Virtual(itemHeight: number, buffer = 3) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => BaseComponent>(
    constructor: T,
  ): T {
    return class VirtualWrapper extends constructor {
      private readonly _scrollTop = signal(0);
      private readonly _viewHeight = signal(600);
      private _container?: HTMLElement;
      private _scrollHandler?: () => void;

      onMount() {
        super.onMount?.();

        this._container =
          document.querySelector<HTMLElement>(
            `[data-component="${constructor.name}"]`,
          ) ?? undefined;

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
      }

      render() {
        const instance = this as unknown as Record<string, unknown>;
        const items = (instance.items as unknown[] | undefined) ?? [];
        const total = items.length;
        const totalH = total * itemHeight;

        const renderItem = instance.renderItem as
          | ((item: unknown, i: number) => VNode | null)
          | undefined;
        if (!renderItem) {
          console.warn(
            `[Virtual] ${constructor.name} must implement renderItem(item, index)`,
          );
          return null;
        }

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
          const result = [];
          for (let i = startIdx(); i <= endIdx(); i++) {
            result.push({ item: items[i], index: i });
          }
          return result;
        });

        const offsetTop = computed(() => startIdx() * itemHeight);
        const offsetBottom = computed(
          () => (total - 1 - endIdx()) * itemHeight,
        );

        return (
          <div style={`height:${String(totalH)}px; position:relative;`}>
            <div style={() => `height:${String(offsetTop())}px;`} />
            {() =>
              visibleItems().map(({ item, index }) => (
                <div
                  key={String(index)}
                  style={`height:${String(itemHeight)}px; overflow:hidden;`}
                >
                  {renderItem.call(this, item, index)}
                </div>
              ))
            }
            <div style={() => `height:${String(offsetBottom())}px;`} />
          </div>
        ) as unknown as VNode;
      }
    } as unknown as T;
  };
}
