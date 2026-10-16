import { Composable } from "@praxisjs/core";
import { computed, endBatch, signal, startBatch } from "@praxisjs/core/internal";

export interface VirtualItem<T> {
  item: T;
  index: number;
}

export class VirtualList<T = unknown> extends Composable {
  declare visibleItems: Array<VirtualItem<T>>;
  declare totalHeight: number;
  declare offsetTop: number;
  declare offsetBottom: number;

  private readonly _scrollTop = signal(0);
  private readonly _viewHeight = signal(600);
  private _el: HTMLElement | null = null;
  private _observer?: ResizeObserver;

  private readonly _onScroll = () => {
    if (this._el) this._scrollTop.set(this._el.scrollTop);
  };

  private readonly _onResize = () => {
    const h = this._el?.clientHeight ?? 0;
    if (h > 0) this._viewHeight.set(h);
  };

  constructor(
    private readonly containerRef: { current: HTMLElement | null },
    private readonly getItems: () => T[],
    private readonly itemHeight: number,
    private readonly buffer = 3,
  ) {
    super();
  }

  setup() {
    const { _scrollTop, _viewHeight, itemHeight, buffer, getItems } = this;

    const items = computed(getItems);
    const total = computed(() => items().length);

    const startIdx = computed(() =>
      Math.max(0, Math.floor(_scrollTop() / itemHeight) - buffer),
    );
    const endIdx = computed(() =>
      Math.min(
        total() - 1,
        Math.ceil((_scrollTop() + _viewHeight()) / itemHeight) + buffer,
      ),
    );

    const visibleItems = computed<Array<VirtualItem<T>>>(() => {
      const arr = items();
      const end = endIdx();
      const result: Array<VirtualItem<T>> = [];
      for (let i = startIdx(); i <= end; i++) {
        result.push({ item: arr[i], index: i });
      }
      return result;
    });

    const totalHeight = computed(() => total() * itemHeight);
    const offsetTop = computed(() => startIdx() * itemHeight);
    const offsetBottom = computed(() =>
      Math.max(0, total() - 1 - endIdx()) * itemHeight,
    );

    return { visibleItems, totalHeight, offsetTop, offsetBottom };
  }

  onMount() {
    const el = this.containerRef.current;
    if (!el || this._el) return;
    this._el = el;

    startBatch();
    this._onResize();
    this._scrollTop.set(el.scrollTop);
    endBatch();

    el.addEventListener("scroll", this._onScroll, { passive: true });
    // The visible window follows the container's height when it is resized, not only at mount.
    if (typeof ResizeObserver !== "undefined") {
      this._observer ??= new ResizeObserver(this._onResize);
      this._observer.observe(el);
    }
  }

  onUnmount() {
    this._el?.removeEventListener("scroll", this._onScroll);
    this._observer?.disconnect();
    this._el = null;
  }
}
