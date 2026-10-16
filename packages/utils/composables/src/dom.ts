import { Composable } from "@praxisjs/core";
import { endBatch, signal, startBatch } from "@praxisjs/core/internal";

const hasWindow = typeof window !== "undefined";

// Listeners and observers start in onMount and stop in onUnmount: setup() runs when the component
// is constructed, which also happens for components that never mount (and on the server).

export class WindowSize extends Composable {
  declare width: number;
  declare height: number;

  private readonly _width = signal(hasWindow ? window.innerWidth : 0);
  private readonly _height = signal(hasWindow ? window.innerHeight : 0);

  private readonly _onResize = () => {
    startBatch();
    this._width.set(window.innerWidth);
    this._height.set(window.innerHeight);
    endBatch();
  };

  setup() {
    return { width: this._width, height: this._height };
  }

  onMount() {
    this._onResize();
    window.addEventListener("resize", this._onResize);
  }

  onUnmount() {
    window.removeEventListener("resize", this._onResize);
  }
}

export class ScrollPosition extends Composable {
  declare x: number;
  declare y: number;

  private readonly _ref?: { current: HTMLElement | null };
  private readonly _staticTarget?: HTMLElement | Window;
  private readonly _x = signal(0);
  private readonly _y = signal(0);
  private _target: HTMLElement | Window | null = null;

  private readonly _onScroll = () => {
    const t = this._target;
    if (t === null) return;
    startBatch();
    if (t === window) {
      this._x.set(window.scrollX);
      this._y.set(window.scrollY);
    } else {
      this._x.set((t as HTMLElement).scrollLeft);
      this._y.set((t as HTMLElement).scrollTop);
    }
    endBatch();
  };

  constructor(
    target: HTMLElement | Window | { current: HTMLElement | null } = window,
  ) {
    super();
    if (typeof target === "object" && "current" in target) {
      this._ref = target as { current: HTMLElement | null };
    } else {
      this._staticTarget = target;
    }
  }

  private _resolveTarget(): HTMLElement | Window {
    if (this._ref) return this._ref.current ?? window;
    return this._staticTarget ?? window;
  }

  setup() {
    return { x: this._x, y: this._y };
  }

  onMount() {
    if (this._target !== null) return;
    // Kept so onUnmount detaches from the same target even if the ref changed meanwhile.
    const t = this._resolveTarget();
    this._target = t;
    t.addEventListener("scroll", this._onScroll);
    this._onScroll();
  }

  onUnmount() {
    this._target?.removeEventListener("scroll", this._onScroll);
    this._target = null;
  }
}

export class ElementSize extends Composable {
  declare width: number;
  declare height: number;

  private _observer?: ResizeObserver;
  private readonly _width = signal(0);
  private readonly _height = signal(0);

  constructor(private readonly ref: { current: HTMLElement | null }) {
    super();
  }

  setup() {
    return { width: this._width, height: this._height };
  }

  onMount() {
    const el = this.ref.current;
    if (!el) return;
    this._observer ??= new ResizeObserver(([entry]) => {
      startBatch();
      this._width.set(entry.contentRect.width);
      this._height.set(entry.contentRect.height);
      endBatch();
    });
    this._observer.observe(el);
    startBatch();
    this._width.set(el.offsetWidth);
    this._height.set(el.offsetHeight);
    endBatch();
  }

  onUnmount() {
    this._observer?.disconnect();
  }
}

export class Intersection extends Composable {
  declare visible: boolean;

  private _observer?: IntersectionObserver;
  private readonly _visible = signal(false);

  constructor(
    private readonly ref: { current: HTMLElement | null },
    private readonly options?: IntersectionObserverInit,
  ) {
    super();
  }

  setup() {
    return { visible: this._visible };
  }

  onMount() {
    const el = this.ref.current;
    if (!el) return;
    this._observer ??= new IntersectionObserver(([entry]) => {
      this._visible.set(entry.isIntersecting);
    }, this.options);
    this._observer.observe(el);
  }

  onUnmount() {
    this._observer?.disconnect();
  }
}

export class Focus extends Composable {
  declare focused: boolean;

  private readonly _focused = signal(false);
  private _el: HTMLElement | null = null;

  private readonly _onFocus = () => {
    this._focused.set(true);
  };
  private readonly _onBlur = () => {
    this._focused.set(false);
  };

  constructor(private readonly ref: { current: HTMLElement | null }) {
    super();
  }

  setup() {
    return { focused: this._focused };
  }

  onMount() {
    if (this._el !== null) return;
    const el = this.ref.current;
    if (!el) return;
    // Kept so onUnmount detaches from the same element even if the ref changed meanwhile.
    this._el = el;
    el.addEventListener("focus", this._onFocus);
    el.addEventListener("blur", this._onBlur);
    this._focused.set(el.ownerDocument.activeElement === el);
  }

  onUnmount() {
    const el = this._el;
    if (el === null) return;
    el.removeEventListener("focus", this._onFocus);
    el.removeEventListener("blur", this._onBlur);
    this._el = null;
  }
}
