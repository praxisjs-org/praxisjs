import { signal } from "@praxisjs/core/internal";

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface LinkPreload {
  href: string;
  as: string;
  type?: string;
  crossOrigin?: "anonymous" | "use-credentials";
}

export interface LinkPrefetch {
  href: string;
  as?: string;
}

export interface HeadConfig {
  title?: string;
  description?: string;
  canonical?: string;
  preload?: LinkPreload[];
  prefetch?: LinkPrefetch[];
  meta?: MetaTag[];
  og?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
}

const ATTR = "data-praxis-head";

interface HeadEntry {
  id: symbol;
  config: HeadConfig;
}

const _stack: HeadEntry[] = [];
let _managed = new Map<string, HTMLElement>();
let _initialTitle: string | undefined;

/** Increments on every head update. Read reactively to subscribe to head changes. */
export const headVersion = signal(0);

export function pushHead(id: symbol, config: HeadConfig): void {
  if (typeof document === "undefined") return;
  _initialTitle ??= document.title;
  const idx = _stack.findIndex((e) => e.id === id);
  if (idx >= 0) {
    _stack[idx].config = config;
  } else {
    _stack.push({ id, config });
  }
  _apply();
}

export function removeHead(id: symbol): void {
  if (typeof document === "undefined") return;
  const idx = _stack.findIndex((e) => e.id === id);
  if (idx >= 0) _stack.splice(idx, 1);
  _apply();
}

interface TagSpec {
  tag: "meta" | "link";
  attrs: Array<[string, string]>;
}

function _collect(config: HeadConfig): TagSpec[] {
  const specs: TagSpec[] = [];
  const name = (key: string, content: string): void => {
    specs.push({ tag: "meta", attrs: [["name", key], ["content", content]] });
  };
  const property = (key: string, content: string): void => {
    specs.push({ tag: "meta", attrs: [["property", key], ["content", content]] });
  };

  if (config.description != null) name("description", config.description);
  if (config.canonical != null) {
    specs.push({ tag: "link", attrs: [["rel", "canonical"], ["href", config.canonical]] });
  }
  for (const link of config.preload ?? []) {
    const attrs: Array<[string, string]> = [["rel", "preload"], ["href", link.href], ["as", link.as]];
    if (link.type != null) attrs.push(["type", link.type]);
    if (link.crossOrigin != null) attrs.push(["crossorigin", link.crossOrigin]);
    specs.push({ tag: "link", attrs });
  }
  for (const link of config.prefetch ?? []) {
    const attrs: Array<[string, string]> = [["rel", "prefetch"], ["href", link.href]];
    if (link.as != null) attrs.push(["as", link.as]);
    specs.push({ tag: "link", attrs });
  }
  for (const tag of config.meta ?? []) {
    if (tag.property != null) property(tag.property, tag.content);
    else if (tag.name != null) name(tag.name, tag.content);
  }

  if (config.og != null) {
    const og = config.og;
    _collectMap(property, {
      "og:title": og.title,
      "og:description": og.description,
      "og:image": og.image,
      "og:url": og.url,
      "og:type": og.type,
      "og:site_name": og.siteName,
    });
  }
  if (config.twitter != null) {
    const tw = config.twitter;
    _collectMap(name, {
      "twitter:card": tw.card,
      "twitter:title": tw.title,
      "twitter:description": tw.description,
      "twitter:image": tw.image,
    });
  }
  return specs;
}

function _collectMap(
  add: (key: string, content: string) => void,
  map: Record<string, string | undefined>,
): void {
  for (const [key, value] of Object.entries(map)) {
    if (value != null) add(key, value);
  }
}

function _create(spec: TagSpec): HTMLElement {
  const el = document.createElement(spec.tag);
  for (const [attr, value] of spec.attrs) el.setAttribute(attr, value);
  el.setAttribute(ATTR, "");
  return el;
}

// Tags the new config shares with the previous one stay in the document untouched instead of being
// removed and recreated on every update; only the difference is added or removed.
function _syncTags(specs: TagSpec[]): void {
  const next = new Map<string, HTMLElement>();
  const occurrences = new Map<string, number>();

  for (const spec of specs) {
    const base = JSON.stringify([spec.tag, spec.attrs]);
    const n = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, n);
    const key = `${base}#${String(n)}`;

    let el = _managed.get(key);
    if (!el?.isConnected) {
      el = _create(spec);
      document.head.appendChild(el);
    }
    next.set(key, el);
  }

  // Also sweeps tags a prerender left in the document, which aren't in `_managed`.
  const keep = new Set(next.values());
  document.head.querySelectorAll(`[${ATTR}]`).forEach((el) => {
    if (!keep.has(el as HTMLElement)) el.remove();
  });
  _managed = next;
}

function _apply(): void {
  headVersion.update((n) => n + 1);

  const top = _stack.at(-1);
  if (top === undefined) {
    _syncTags([]);
    document.title = _initialTitle ?? "";
    return;
  }

  const { config } = top;
  if (config.title != null) document.title = config.title;
  _syncTags(_collect(config));
}

/**
 * Resets all head state — the tag stack and the remembered initial `<title>`.
 * Used between pages in an `@praxisjs/ssg` prerender run (same Node process,
 * many `render()` calls) so one route's `<head>` never leaks into the next;
 * also used by this package's own tests.
 */
export function resetHeadState(): void {
  _stack.length = 0;
  _managed = new Map();
  _initialTitle = undefined;
  if (typeof document !== "undefined") {
    document.querySelectorAll(`[${ATTR}]`).forEach((el) => { el.remove(); });
  }
}
