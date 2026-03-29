import { Composable } from "@praxisjs/core";
import { signal, effect } from "@praxisjs/core/internal";

export class WindowSize extends Composable {
  declare width: number;
  declare height: number;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _handler = () => {};
  private _view?: Record<string, unknown>;

  setup() {
    if (this._view) return this._view;
    const width = signal(window.innerWidth);
    const height = signal(window.innerHeight);
    this._handler = () => {
      width.set(window.innerWidth);
      height.set(window.innerHeight);
    };
    window.addEventListener("resize", this._handler);
    this._view = { width, height };
    return this._view;
  }

  onUnmount() {
    window.removeEventListener("resize", this._handler);
  }
}

export class ScrollPosition extends Composable {
  declare x: number;
  declare y: number;

  private readonly _target: HTMLElement | Window;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _handler = () => {};
  private _view?: Record<string, unknown>;

  constructor(target: HTMLElement | Window = window) {
    super();
    this._target = target;
  }

  setup() {
    if (this._view) return this._view;
    const x = signal(0);
    const y = signal(0);
    const t = this._target;
    this._handler = () => {
      x.set(t === window ? window.scrollX : (t as HTMLElement).scrollLeft);
      y.set(t === window ? window.scrollY : (t as HTMLElement).scrollTop);
    };
    t.addEventListener("scroll", this._handler);
    this._view = { x, y };
    return this._view;
  }

  onUnmount() {
    this._target.removeEventListener("scroll", this._handler);
  }
}

export class ElementSize extends Composable {
  declare width: number;
  declare height: number;

  private _observer?: ResizeObserver;
  private _view?: Record<string, unknown>;

  constructor(private readonly ref: { current: HTMLElement | null }) {
    super();
  }

  setup() {
    if (this._view) return this._view;
    const width = signal(0);
    const height = signal(0);
    this._observer = new ResizeObserver(([entry]) => {
      width.set(entry.contentRect.width);
      height.set(entry.contentRect.height);
    });
    effect(() => {
      if (this.ref.current) {
        this._observer?.observe(this.ref.current);
        width.set(this.ref.current.offsetWidth);
        height.set(this.ref.current.offsetHeight);
      }
    });
    this._view = { width, height };
    return this._view;
  }

  onUnmount() {
    this._observer?.disconnect();
  }
}

export class Intersection extends Composable {
  declare visible: boolean;

  private _observer?: IntersectionObserver;
  private _view?: Record<string, unknown>;

  constructor(
    private readonly ref: { current: HTMLElement | null },
    private readonly options?: IntersectionObserverInit,
  ) {
    super();
  }

  setup() {
    if (this._view) return this._view;
    const visible = signal(false);
    this._observer = new IntersectionObserver(([entry]) => {
      visible.set(entry.isIntersecting);
    }, this.options);
    effect(() => {
      if (this.ref.current) this._observer?.observe(this.ref.current);
    });
    this._view = { visible };
    return this._view;
  }

  onUnmount() {
    this._observer?.disconnect();
  }
}

export class Focus extends Composable {
  declare focused: boolean;

  private _view?: Record<string, unknown>;

  constructor(private readonly ref: { current: HTMLElement | null }) {
    super();
  }

  setup() {
    if (this._view) return this._view;
    const focused = signal(false);
    effect(() => {
      const el = this.ref.current;
      if (!el) return;
      const onFocus = () => { focused.set(true); };
      const onBlur = () => { focused.set(false); };
      el.addEventListener("focus", onFocus);
      el.addEventListener("blur", onBlur);
      return () => {
        el.removeEventListener("focus", onFocus);
        el.removeEventListener("blur", onBlur);
      };
    });
    this._view = { focused };
    return this._view;
  }
}
