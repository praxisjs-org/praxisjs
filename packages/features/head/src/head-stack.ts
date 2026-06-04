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

function _apply(): void {
  headVersion.update((n) => n + 1);
  document.querySelectorAll(`[${ATTR}]`).forEach((el) => { el.remove(); });

  const top = _stack.at(-1);
  if (top === undefined) {
    document.title = _initialTitle ?? "";
    return;
  }

  const { config } = top;

  if (config.title != null) document.title = config.title;
  if (config.description != null) _metaName("description", config.description);
  if (config.canonical != null) _canonical(config.canonical);
  for (const link of config.preload ?? []) _linkPreload(link);
  for (const link of config.prefetch ?? []) _linkPrefetch(link);

  for (const tag of config.meta ?? []) {
    if (tag.property != null) _metaProp(tag.property, tag.content);
    else if (tag.name != null) _metaName(tag.name, tag.content);
  }

  if (config.og != null) {
    const og = config.og;
    _applyMap("property", {
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
    _applyMap("name", {
      "twitter:card": tw.card,
      "twitter:title": tw.title,
      "twitter:description": tw.description,
      "twitter:image": tw.image,
    });
  }
}

function _applyMap(
  attr: "name" | "property",
  map: Record<string, string | undefined>,
): void {
  for (const [key, value] of Object.entries(map)) {
    if (value != null) {
      if (attr === "name") { _metaName(key, value); } else { _metaProp(key, value); }
    }
  }
}

function _metaName(name: string, content: string): void {
  const el = document.createElement("meta");
  el.name = name;
  el.content = content;
  el.setAttribute(ATTR, "");
  document.head.appendChild(el);
}

function _metaProp(property: string, content: string): void {
  const el = document.createElement("meta");
  el.setAttribute("property", property);
  el.content = content;
  el.setAttribute(ATTR, "");
  document.head.appendChild(el);
}

function _canonical(href: string): void {
  const el = document.createElement("link");
  el.rel = "canonical";
  el.href = href;
  el.setAttribute(ATTR, "");
  document.head.appendChild(el);
}

function _linkPreload(link: LinkPreload): void {
  const el = document.createElement("link");
  el.rel = "preload";
  el.href = link.href;
  el.setAttribute("as", link.as);
  if (link.type != null) el.type = link.type;
  if (link.crossOrigin != null) el.crossOrigin = link.crossOrigin;
  el.setAttribute(ATTR, "");
  document.head.appendChild(el);
}

function _linkPrefetch(link: LinkPrefetch): void {
  const el = document.createElement("link");
  el.rel = "prefetch";
  el.href = link.href;
  if (link.as != null) el.setAttribute("as", link.as);
  el.setAttribute(ATTR, "");
  document.head.appendChild(el);
}

/** Resets all head state. For use in tests only. */
export function _resetHead(): void {
  _stack.length = 0;
  _initialTitle = undefined;
  if (typeof document !== "undefined") {
    document.querySelectorAll(`[${ATTR}]`).forEach((el) => { el.remove(); });
  }
}
