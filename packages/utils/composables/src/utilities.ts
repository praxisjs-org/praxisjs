import { Composable } from "@praxisjs/core";
import { signal, computed } from "@praxisjs/core/internal";
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
        content.set(text);
        copied.set(true);
        setTimeout(() => { copied.set(false); }, resetDelay);
      } catch {
        console.warn("[Clipboard] Falha ao copiar");
      }
    };

    return { copied, content, copy };
  }
}

export class Geolocation extends Composable {
  declare lat: number | null;
  declare lng: number | null;
  declare error: GeolocationPositionError | null;
  declare loading: boolean;

  constructor(private readonly options?: PositionOptions) {
    super();
  }

  setup() {
    const lat = signal<number | null>(null);
    const lng = signal<number | null>(null);
    const error = signal<GeolocationPositionError | null>(null);
    const loading = signal(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lat.set(pos.coords.latitude);
        lng.set(pos.coords.longitude);
        loading.set(false);
      },
      (err) => {
        error.set(err);
        loading.set(false);
      },
      this.options,
    );

    return { lat, lng, error, loading };
  }
}

export class TimeAgo extends Composable {
  declare value: string;

  private _interval?: ReturnType<typeof setInterval>;

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
    const tick = signal(Date.now());
    this._interval = setInterval(() => { tick.set(Date.now()); }, 60_000);

    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" });
    const read = this.source;

    const value = computed(() => {
      void tick();
      const diff = new Date(read() as Date).getTime() - Date.now();
      const abs = Math.abs(diff);
      if (abs < 60_000) return rtf.format(Math.round(diff / 1000), "second");
      if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
      if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
      if (abs < 2_592_000_000) return rtf.format(Math.round(diff / 86_400_000), "day");
      return rtf.format(Math.round(diff / 2_592_000_000), "month");
    });

    return { value };
  }

  onUnmount() {
    clearInterval(this._interval);
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
