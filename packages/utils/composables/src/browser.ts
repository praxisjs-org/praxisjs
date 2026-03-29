import { Composable } from "@praxisjs/core";
import { signal, computed } from "@praxisjs/core/internal";

export class MediaQuery extends Composable {
  declare matches: boolean;

  private _mql?: MediaQueryList;
  private _handler?: (e: MediaQueryListEvent) => void;
  private _view?: Record<string, unknown>;

  constructor(private readonly query: string) {
    super();
  }

  setup() {
    if (this._view) return this._view;
    this._mql = window.matchMedia(this.query);
    const matches = signal(this._mql.matches);
    this._handler = (e) => { matches.set(e.matches); };
    this._mql.addEventListener("change", this._handler);
    this._view = { matches };
    return this._view;
  }

  onUnmount() {
    if (this._mql && this._handler) {
      this._mql.removeEventListener("change", this._handler);
    }
  }
}

export class ColorScheme extends Composable {
  declare isDark: boolean;
  declare isLight: boolean;

  private _mql?: MediaQueryList;
  private _handler?: (e: MediaQueryListEvent) => void;
  private _view?: Record<string, unknown>;

  setup() {
    if (this._view) return this._view;
    this._mql = window.matchMedia("(prefers-color-scheme: dark)");
    const isDark = signal(this._mql.matches);
    const isLight = computed(() => !isDark());
    this._handler = (e) => { isDark.set(e.matches); };
    this._mql.addEventListener("change", this._handler);
    this._view = { isDark, isLight };
    return this._view;
  }

  onUnmount() {
    if (this._mql && this._handler) {
      this._mql.removeEventListener("change", this._handler);
    }
  }
}

export class Mouse extends Composable {
  declare x: number;
  declare y: number;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _handler = (_e: MouseEvent) => {};
  private _view?: Record<string, unknown>;

  setup() {
    if (this._view) return this._view;
    const x = signal(0);
    const y = signal(0);
    this._handler = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", this._handler);
    this._view = { x, y };
    return this._view;
  }

  onUnmount() {
    window.removeEventListener("mousemove", this._handler);
  }
}

export class KeyCombo extends Composable {
  declare pressed: boolean;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _keydownHandler = (_e: KeyboardEvent) => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private _keyupHandler = () => {};
  private _view?: Record<string, unknown>;

  constructor(private readonly combo: string) {
    super();
  }

  setup() {
    if (this._view) return this._view;
    const parts = this.combo.toLowerCase().split("+").map((p) => p.trim());
    const pressed = signal(false);

    const modifiers = ["ctrl", "shift", "alt", "meta"];
    const key = parts.find((p) => !modifiers.includes(p));

    // A combo with no non-modifier key is invalid and should never fire
    if (!key) {
      this._keyupHandler = () => { pressed.set(false); };
      window.addEventListener("keydown", this._keydownHandler);
      window.addEventListener("keyup", this._keyupHandler);
      this._view = { pressed };
      return this._view;
    }

    this._keydownHandler = (e) => {
      const ctrl = parts.includes("ctrl") ? e.ctrlKey : true;
      const shift = parts.includes("shift") ? e.shiftKey : true;
      const alt = parts.includes("alt") ? e.altKey : true;
      const meta = parts.includes("meta") ? e.metaKey : true;
      if (ctrl && shift && alt && meta && e.key.toLowerCase() === key) {
        pressed.set(true);
      }
    };
    this._keyupHandler = () => { pressed.set(false); };

    window.addEventListener("keydown", this._keydownHandler);
    window.addEventListener("keyup", this._keyupHandler);
    this._view = { pressed };
    return this._view;
  }

  onUnmount() {
    window.removeEventListener("keydown", this._keydownHandler);
    window.removeEventListener("keyup", this._keyupHandler);
  }
}

export class Idle extends Composable {
  declare idle: boolean;

  private _listeners: Array<[string, () => void]> = [];
  private _timer?: ReturnType<typeof setTimeout>;
  private _view?: Record<string, unknown>;

  constructor(private readonly timeout = 60_000) {
    super();
  }

  setup() {
    if (this._view) return this._view;
    const idle = signal(false);
    const reset = () => {
      idle.set(false);
      clearTimeout(this._timer);
      this._timer = setTimeout(() => { idle.set(true); }, this.timeout);
    };

    ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((event) => {
      window.addEventListener(event, reset, { passive: true });
      this._listeners.push([event, reset]);
    });

    reset();
    this._view = { idle };
    return this._view;
  }

  onUnmount() {
    clearTimeout(this._timer);
    this._listeners.forEach(([event, handler]) => {
      window.removeEventListener(event, handler);
    });
    this._listeners = [];
  }
}
