import { Composable } from "@praxisjs/core";
import {
  computed,
  createEffect,
  disposeEffect,
  endBatch,
  signal,
  startBatch,
  type EffectNode,
} from "@praxisjs/core/internal";
import type { Signal, Computed } from "@praxisjs/shared";

export interface PaginationOptions {
  total: number;
  pageSize: number;
  initial?: number;
}

export class Clipboard extends Composable {
  declare copied: boolean;
  declare content: string;
  declare copy: (text: string) => Promise<void>;

  private _resetTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly resetDelay = 2000) {
    super();
  }

  setup() {
    const copied = signal(false);
    const content = signal("");
    const resetDelay = this.resetDelay;

    const copy = async (text: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(text);
        startBatch();
        content.set(text);
        copied.set(true);
        endBatch();
        clearTimeout(this._resetTimer);
        this._resetTimer = setTimeout(() => { copied.set(false); }, resetDelay);
      } catch {
        console.warn("[Clipboard] Falha ao copiar");
      }
    };

    return { copied, content, copy };
  }

  onUnmount() {
    clearTimeout(this._resetTimer);
  }
}

export class Geolocation extends Composable {
  declare lat: number | null;
  declare lng: number | null;
  declare error: GeolocationPositionError | null;
  declare loading: boolean;

  private readonly _lat = signal<number | null>(null);
  private readonly _lng = signal<number | null>(null);
  private readonly _error = signal<GeolocationPositionError | null>(null);
  private readonly _loading = signal(true);
  private _active = false;

  constructor(private readonly options?: PositionOptions) {
    super();
  }

  setup() {
    return { lat: this._lat, lng: this._lng, error: this._error, loading: this._loading };
  }

  // Requested on mount rather than in setup(), which also runs for components that never mount.
  onMount() {
    if (this._active) return;
    this._active = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!this._active) return;
        startBatch();
        this._lat.set(pos.coords.latitude);
        this._lng.set(pos.coords.longitude);
        this._loading.set(false);
        endBatch();
      },
      (err) => {
        if (!this._active) return;
        startBatch();
        this._error.set(err);
        this._loading.set(false);
        endBatch();
      },
      this.options,
    );
  }

  onUnmount() {
    this._active = false;
  }
}

const SECOND = 1_000;
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const MONTH = 2_592_000_000;
// setTimeout fires immediately for delays above 2^31 - 1 ms.
const MAX_DELAY = 2_147_483_647;

interface TimeUnit {
  /** The unit applies while |diff| is below this. */
  below: number;
  size: number;
  name: Intl.RelativeTimeFormatUnit;
}

const UNITS: TimeUnit[] = [
  { below: MINUTE, size: SECOND, name: "second" },
  { below: HOUR, size: MINUTE, name: "minute" },
  { below: DAY, size: HOUR, name: "hour" },
  { below: MONTH, size: DAY, name: "day" },
  { below: Infinity, size: MONTH, name: "month" },
];

function unitIndex(diff: number): number {
  const abs = Math.abs(diff);
  let i = 0;
  while (abs >= UNITS[i].below) i++;
  return i;
}

/**
 * Milliseconds until the text for `diff` (target − now, shrinking as time passes) changes: the
 * next rounding step within its unit, or the moment it crosses into another unit.
 */
export function msUntilChange(diff: number): number {
  const i = unitIndex(diff);
  const { size, below } = UNITS[i];
  // Math.round(x) changes once x falls below its value minus one half.
  let wait = diff - (Math.round(diff / size) - 0.5) * size + 1;
  if (diff > 0) {
    if (i > 0) wait = Math.min(wait, diff - UNITS[i - 1].below + 1);
  } else if (below !== Infinity) {
    wait = Math.min(wait, diff + below);
  }
  return Math.min(Math.max(Math.ceil(wait), 1), MAX_DELAY);
}

export class TimeAgo extends Composable {
  declare value: string;

  private readonly _tick = signal(0);
  private _effect?: EffectNode;

  constructor(
    private readonly source:
      | Signal<Date | number>
      | Computed<Date | number>
      | (() => Date | number),
    private readonly locale = "pt-BR",
  ) {
    super();
  }

  setup() {
    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" });
    const read = this.source;
    const tick = this._tick;

    const value = computed(() => {
      void tick();
      const diff = new Date(read() as Date).getTime() - Date.now();
      const { size, name } = UNITS[unitIndex(diff)];
      return rtf.format(Math.round(diff / size), name);
    });

    return { value };
  }

  // One timer for the exact moment the text changes, instead of polling: re-armed whenever it
  // fires or the source changes.
  onMount() {
    if (this._effect) return;
    const read = this.source;
    const tick = this._tick;
    this._effect = createEffect(() => {
      tick();
      const diff = new Date(read() as Date).getTime() - Date.now();
      // An invalid date has no next change; a NaN delay would fire at once, over and over.
      if (Number.isNaN(diff)) return;
      const timer = setTimeout(() => { tick.update((n) => n + 1); }, msUntilChange(diff));
      return () => { clearTimeout(timer); };
    });
  }

  onUnmount() {
    if (this._effect) disposeEffect(this._effect);
    this._effect = undefined;
  }
}

export class Pagination extends Composable {
  declare page: number;
  declare totalPages: number;
  declare offset: number;
  declare hasNext: boolean;
  declare hasPrev: boolean;
  declare pageSize: number;
  declare pages: number[];
  declare next: () => void;
  declare prev: () => void;
  declare goTo: (p: number) => void;
  declare first: () => void;
  declare last: () => void;

  constructor(private readonly options: PaginationOptions) {
    super();
    if (options.pageSize <= 0) {
      throw new Error("pageSize must be greater than 0");
    }
  }

  setup() {
    const opts = this.options;
    const _page = signal(opts.initial ?? 1);
    const totalPages = computed(() => Math.ceil(opts.total / opts.pageSize));
    const page = computed(() => Math.min(_page(), totalPages()));
    const offset = computed(() => (page() - 1) * opts.pageSize);
    const hasNext = computed(() => page() < totalPages());
    const hasPrev = computed(() => page() > 1);

    return {
      page,
      totalPages,
      offset,
      hasNext,
      hasPrev,
      pageSize: computed(() => opts.pageSize),
      pages: computed(() => Array.from({ length: totalPages() }, (_, i) => i + 1)),
      next: () => { if (hasNext()) _page.update((p) => p + 1); },
      prev: () => { if (hasPrev()) _page.update((p) => p - 1); },
      goTo: (p: number) => { _page.set(Math.max(1, Math.min(p, totalPages()))); },
      first: () => { _page.set(1); },
      last: () => { _page.set(totalPages()); },
    };
  }
}
