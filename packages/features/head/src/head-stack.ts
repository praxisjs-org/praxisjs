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
// Tags a prerender left in the document are not in `_managed`; they are swept once, on the first
// sync, instead of querying the whole <head> on every update.
let _swept = false;

/** Increments on every head update. Read reactively to subscribe to head changes. */
export const headVersion = signal(0);

function _bump(): void {
  headVersion.update((n) => n + 1);
}

export function pushHead(id: symbol, config: HeadConfig): void {
  if (typeof document === "undefined") return;
  _initialTitle ??= document.title;
  const idx = _stack.findIndex((e) => e.id === id);
  if (idx === -1) {
    _stack.push({ id, config });
  } else {
    _stack[idx].config = config;
    // Only the top entry is shown; one below it changes nothing in the document yet.
    if (idx !== _stack.length - 1) {
      _bump();
      return;
    }
  }
  _apply();
}

export function removeHead(id: symbol): void {
  if (typeof document === "undefined") return;
  const idx = _stack.findIndex((e) => e.id === id);
  if (idx === -1) return;
  const wasTop = idx === _stack.length - 1;
  _stack.splice(idx, 1);
  if (wasTop) _apply();
  else _bump();
}

interface TagSpec {
  tag: "meta" | "link";
  /** Attribute names and values, alternating. */
  attrs: string[];
}

function _meta(specs: TagSpec[], attr: "name" | "property", key: string, content: string | undefined): void {
  if (content != null) specs.push({ tag: "meta", attrs: [attr, key, "content", content] });
}

function _collect(config: HeadConfig): TagSpec[] {
  const specs: TagSpec[] = [];

  _meta(specs, "name", "description", config.description);
  if (config.canonical != null) {
    specs.push({ tag: "link", attrs: ["rel", "canonical", "href", config.canonical] });
  }
  for (const link of config.preload ?? []) {
    const attrs = ["rel", "preload", "href", link.href, "as", link.as];
    if (link.type != null) attrs.push("type", link.type);
    if (link.crossOrigin != null) attrs.push("crossorigin", link.crossOrigin);
    specs.push({ tag: "link", attrs });
  }
  for (const link of config.prefetch ?? []) {
    const attrs = ["rel", "prefetch", "href", link.href];
    if (link.as != null) attrs.push("as", link.as);
    specs.push({ tag: "link", attrs });
  }
  for (const tag of config.meta ?? []) {
    if (tag.property != null) _meta(specs, "property", tag.property, tag.content);
    else if (tag.name != null) _meta(specs, "name", tag.name, tag.content);
  }

  const og = config.og;
  if (og != null) {
    _meta(specs, "property", "og:title", og.title);
    _meta(specs, "property", "og:description", og.description);
    _meta(specs, "property", "og:image", og.image);
    _meta(specs, "property", "og:url", og.url);
    _meta(specs, "property", "og:type", og.type);
    _meta(specs, "property", "og:site_name", og.siteName);
  }
  const tw = config.twitter;
  if (tw != null) {
    _meta(specs, "name", "twitter:card", tw.card);
    _meta(specs, "name", "twitter:title", tw.title);
    _meta(specs, "name", "twitter:description", tw.description);
    _meta(specs, "name", "twitter:image", tw.image);
  }
  return specs;
}

function _create(spec: TagSpec): HTMLElement {
  const el = document.createElement(spec.tag);
  const { attrs } = spec;
  for (let i = 0; i < attrs.length; i += 2) el.setAttribute(attrs[i], attrs[i + 1]);
  el.setAttribute(ATTR, "");
  return el;
}

// Tags the new config shares with the previous one stay in the document untouched instead of being
// removed and recreated on every update; only the difference is added or removed.
function _syncTags(specs: TagSpec[]): void {
  const next = new Map<string, HTMLElement>();

  for (const spec of specs) {
    const base = `${spec.tag}\0${spec.attrs.join("\0")}`;
    let key = base;
    for (let n = 2; next.has(key); n++) key = `${base}#${String(n)}`;

    let el = _managed.get(key);
    if (el?.isConnected) {
      _managed.delete(key);
    } else {
      el = _create(spec);
      document.head.appendChild(el);
    }
    next.set(key, el);
  }

  for (const stale of _managed.values()) stale.remove();

  if (!_swept) {
    _swept = true;
    const keep = new Set<Element>(next.values());
    document.head.querySelectorAll(`[${ATTR}]`).forEach((el) => {
      if (!keep.has(el)) el.remove();
    });
  }
  _managed = next;
}

function _apply(): void {
  _bump();

  const top = _stack.at(-1);
  if (top === undefined) {
    _syncTags([]);
    // Set by the push that the removal emptying the stack undid.
    document.title = _initialTitle as string;
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
  _swept = false;
  if (typeof document !== "undefined") {
    document.querySelectorAll(`[${ATTR}]`).forEach((el) => { el.remove(); });
  }
}
