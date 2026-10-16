import { Composable } from "@praxisjs/core";
import { computed, endBatch, signal, startBatch } from "@praxisjs/core/internal";

const hasWindow = typeof window !== "undefined";

// Listeners and timers start in onMount and stop in onUnmount: setup() runs when the component is
// constructed, which also happens for components that never mount (and on the server).

export class MediaQuery extends Composable {
  declare matches: boolean;

  private _mql?: MediaQueryList;
  private readonly _matches = signal(false);

  private readonly _onChange = (e: MediaQueryListEvent) => {
    this._matches.set(e.matches);
  };

  constructor(private readonly query: string) {
    super();
  }

  setup() {
    if (hasWindow) {
      this._mql ??= window.matchMedia(this.query);
      this._matches.set(this._mql.matches);
    }
    return { matches: this._matches };
  }

  onMount() {
    const mql = this._mql;
    if (!mql) return;
    this._matches.set(mql.matches);
    mql.addEventListener("change", this._onChange);
  }

  onUnmount() {
    this._mql?.removeEventListener("change", this._onChange);
  }
}

export class ColorScheme extends Composable {
  declare isDark: boolean;
  declare isLight: boolean;

  private readonly _query = new MediaQuery("(prefers-color-scheme: dark)");

  setup() {
    const isDark = this._query.setup().matches;
    const isLight = computed(() => !isDark());
    return { isDark, isLight };
  }

  onMount() {
    this._query.onMount();
  }

  onUnmount() {
    this._query.onUnmount();
  }
}

export class Mouse extends Composable {
  declare x: number;
  declare y: number;

  private readonly _x = signal(0);
  private readonly _y = signal(0);

  private readonly _onMove = (e: MouseEvent) => {
    startBatch();
    this._x.set(e.clientX);
    this._y.set(e.clientY);
    endBatch();
  };

  setup() {
    return { x: this._x, y: this._y };
  }

  onMount() {
    window.addEventListener("mousemove", this._onMove);
  }

  onUnmount() {
    window.removeEventListener("mousemove", this._onMove);
  }
}

const MODIFIERS = ["ctrl", "shift", "alt", "meta"];

export class KeyCombo extends Composable {
  declare pressed: boolean;

  private readonly _pressed = signal(false);
  // Parsed once: the keydown handler runs for every key press on the page.
  private readonly _key: string | undefined;
  private readonly _ctrl: boolean;
  private readonly _shift: boolean;
  private readonly _alt: boolean;
  private readonly _meta: boolean;

  private readonly _onKeyDown = (e: KeyboardEvent) => {
    if (
      (!this._ctrl || e.ctrlKey) &&
      (!this._shift || e.shiftKey) &&
      (!this._alt || e.altKey) &&
      (!this._meta || e.metaKey) &&
      e.key.toLowerCase() === this._key
    ) {
      this._pressed.set(true);
    }
  };

  private readonly _onKeyUp = () => {
    this._pressed.set(false);
  };

  constructor(combo: string) {
    super();
    const parts = combo.toLowerCase().split("+").map((p) => p.trim());
    this._key = parts.find((p) => !MODIFIERS.includes(p));
    this._ctrl = parts.includes("ctrl");
    this._shift = parts.includes("shift");
    this._alt = parts.includes("alt");
    this._meta = parts.includes("meta");
  }

  setup() {
    return { pressed: this._pressed };
  }

  onMount() {
    // A combo with no non-modifier key is invalid and never fires.
    if (this._key !== undefined) window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  onUnmount() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }
}

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export class Idle extends Composable {
  declare idle: boolean;

  private readonly _idle = signal(false);
  private _timer?: ReturnType<typeof setTimeout>;
  private _lastActivity = 0;

  // Activity only records a timestamp: rescheduling a timer on every mousemove or scroll event was
  // the expensive part. The single pending timer checks the timestamp when it fires.
  private readonly _onActivity = () => {
    this._lastActivity = Date.now();
    if (this._timer === undefined) {
      this._idle.set(false);
      this._schedule(this.timeout);
    }
  };

  private readonly _check = () => {
    const remaining = this.timeout - (Date.now() - this._lastActivity);
    if (remaining > 0) {
      this._schedule(remaining);
    } else {
      this._timer = undefined;
      this._idle.set(true);
    }
  };

  constructor(private readonly timeout = 60_000) {
    super();
  }

  private _schedule(delay: number) {
    this._timer = setTimeout(this._check, delay);
  }

  setup() {
    return { idle: this._idle };
  }

  onMount() {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, this._onActivity, { passive: true });
    }
    clearTimeout(this._timer);
    this._timer = undefined;
    this._onActivity();
  }

  onUnmount() {
    clearTimeout(this._timer);
    this._timer = undefined;
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, this._onActivity);
    }
  }
}
