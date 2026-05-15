import { Composable } from "@praxisjs/core";
import { signal } from "@praxisjs/core/internal";

export class WindowSize extends Composable {
  declare width: number;
  declare height: number;

  private _handler!: () => void;
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

  private readonly _ref?: { current: HTMLElement | null };
  private readonly _staticTarget?: HTMLElement | Window;
  private _handler!: () => void;
  private _x!: ReturnType<typeof signal<number>>;
  private _y!: ReturnType<typeof signal<number>>;
  private _mounted = false;

  constructor(target: HTMLElement | Window | { current: HTMLElement | null } = window) {
    super();
    if (typeof target === "object" && "current" in target) {
      this._ref = target as { current: HTMLElement | null };
    } else {
      this._staticTarget = target;
    }
  }

  private get _target(): HTMLElement | Window {
    return this._ref ? (this._ref.current ?? window) : (this._staticTarget ?? window);
  }

  setup() {
    this._x = signal(0);
    this._y = signal(0);
    return { x: this._x, y: this._y };
  }

  onMount() {
    if (this._mounted) return;
    this._mounted = true;
    const t = this._target;
    this._handler = () => {
      this._x.set(t === window ? window.scrollX : (t as HTMLElement).scrollLeft);
      this._y.set(t === window ? window.scrollY : (t as HTMLElement).scrollTop);
    };
    t.addEventListener("scroll", this._handler);
    // set initial values
    this._x.set(t === window ? window.scrollX : (t as HTMLElement).scrollLeft);
    this._y.set(t === window ? window.scrollY : (t as HTMLElement).scrollTop);
  }

  onUnmount() {
    this._mounted = false;
    this._target.removeEventListener("scroll", this._handler);
  }
}

export class ElementSize extends Composable {
  declare width: number;
  declare height: number;

  private _observer?: ResizeObserver;
  private _width!: ReturnType<typeof signal<number>>;
  private _height!: ReturnType<typeof signal<number>>;
  private _view?: Record<string, unknown>;

  constructor(private readonly ref: { current: HTMLElement | null }) {
    super();
  }

  setup() {
    if (this._view) return this._view;
    this._width = signal(0);
    this._height = signal(0);
    this._observer = new ResizeObserver(([entry]) => {
      this._width.set(entry.contentRect.width);
      this._height.set(entry.contentRect.height);
    });
    this._view = { width: this._width, height: this._height };
    return this._view;
  }

  onMount() {
    const el = this.ref.current;
    if (!el) return;
    this._observer?.observe(el);
    this._width.set(el.offsetWidth);
    this._height.set(el.offsetHeight);
  }

  onUnmount() {
    this._observer?.disconnect();
  }
}

export class Intersection extends Composable {
  declare visible: boolean;

  private _observer?: IntersectionObserver;
  private _visible!: ReturnType<typeof signal<boolean>>;
  private _view?: Record<string, unknown>;

  constructor(
    private readonly ref: { current: HTMLElement | null },
    private readonly options?: IntersectionObserverInit,
  ) {
    super();
  }

  setup() {
    if (this._view) return this._view;
    this._visible = signal(false);
    this._observer = new IntersectionObserver(([entry]) => {
      this._visible.set(entry.isIntersecting);
    }, this.options);
    this._view = { visible: this._visible };
    return this._view;
  }

  onMount() {
    const el = this.ref.current;
    if (el) this._observer?.observe(el);
  }

  onUnmount() {
    this._observer?.disconnect();
  }
}

export class Focus extends Composable {
  declare focused: boolean;

  private _focused!: ReturnType<typeof signal<boolean>>;
  private readonly _onFocus = () => { this._focused.set(true); };
  private readonly _onBlur = () => { this._focused.set(false); };
  private _mounted = false;

  constructor(private readonly ref: { current: HTMLElement | null }) {
    super();
  }

  setup() {
    this._focused = signal(false);
    return { focused: this._focused };
  }

  onMount() {
    if (this._mounted) return;
    this._mounted = true;
    const el = this.ref.current;
    if (!el) return;
    el.addEventListener("focus", this._onFocus);
    el.addEventListener("blur", this._onBlur);
  }

  onUnmount() {
    this._mounted = false;
    const el = this.ref.current;
    if (!el) return;
    el.removeEventListener("focus", this._onFocus);
    el.removeEventListener("blur", this._onBlur);
  }
}
