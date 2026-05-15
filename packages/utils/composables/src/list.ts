import { Composable } from "@praxisjs/core";
import { computed, signal } from "@praxisjs/core/internal";

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
  private _scrollCleanup?: () => void;

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
      const result: Array<VirtualItem<T>> = [];
      for (let i = startIdx(); i <= endIdx(); i++) {
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
    if (!el) return;

    const h = el.clientHeight;
    if (h > 0) this._viewHeight.set(h);

    const handler = () => { this._scrollTop.set(el.scrollTop); };
    el.addEventListener("scroll", handler);
    this._scrollCleanup = () => { el.removeEventListener("scroll", handler); };
  }

  onUnmount() {
    this._scrollCleanup?.();
  }
}
