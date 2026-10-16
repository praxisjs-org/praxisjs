import { mountChildren } from "./children";
import { getCurrentScope } from "./context";
import { createElement } from "./dom/create";
import { addDelegatedEvent, delegatedProp, type DelegatedType } from "./dom/events";
import { applyProp, bindClass, hasWritableProperty, setProp } from "./dom/props";
import { recording, recordProp } from "./hydration-context";
import { mountReactive } from "./reactive";

import type { Scope } from "./scope";

// Runtime half of the compiled templates emitted by @praxisjs/vite-plugin. The static part of a JSX
// tree is built once, then every instance is a single cloneNode(true) plus the bindings for its
// dynamic parts. template() builds it with the same DOM calls a plain render makes; html() parses
// markup the compiler emits only where the parser builds that same tree.

type Patch = [path: number[], key: string, value: unknown];

/** A reactive child's position: the comment it inserts its nodes before. */
export const MARKER = 0;

let pendingPatches: Array<[Element, string, unknown]> | null = null;

// Templates are built in the inert document that <template> contents live in: cloning there and
// letting the insertion adopt the clone is cheaper than cloning inside the live document. Custom
// elements are the exception, since only the live document upgrades them, so a template that
// contains one is built (and cloned) there instead.
let inertDocument: Document | null = null;
// null is the live document, looked up when used: the module is imported before any DOM exists
// when a server renderer installs one afterwards.
let buildDocument: Document | null = null;
let sawCustomElement = false;
// The global document the cached templates were built for, and a counter that tells every template
// to build again. A server renderer may install a new window (a new global document) for each run:
// nodes cloned from another window's templates fail every `instanceof Node` check and are dropped.
let templatesDocument: Document | null = null;
let generation = 0;

function inert(): Document {
  templatesDocument ??= document;
  return (inertDocument ??= document.createElement("template").content.ownerDocument);
}

/** Called by render(): templates built for another global document are built again on next use. */
export function syncTemplateDocument(): void {
  if (templatesDocument === null || templatesDocument === document) return;
  templatesDocument = null;
  inertDocument = null;
  generation++;
}

// Attribute-level props survive cloneNode, so they are applied to the template itself. A prop that
// lives only in a property (an expando, a custom element's field) would be lost by cloning, so it is
// replayed on every clone instead. Which is which is checked on a probe element, not guessed.
function bakeProp(el: Element, key: string, value: unknown): void {
  const name = key === "htmlFor" ? "for" : key;
  if (name === "class" || name === "className" || name === "style" || value === null || value === undefined) {
    setProp(el, name, value);
    return;
  }
  // Deep, so state held by the children (a <select>'s chosen option) is part of the check.
  const probe = el.cloneNode(true) as Element & Record<string, unknown>;
  setProp(probe, name, value);
  const survives =
    !hasWritableProperty(probe, name) ||
    Object.is((probe.cloneNode(true) as Element & Record<string, unknown>)[name], probe[name]);
  if (survives) setProp(el, name, value);
  else (pendingPatches as Array<[Element, string, unknown]>).push([el, name, value]);
}

function appendStatic(parent: Node, child: unknown): void {
  if (child === MARKER) {
    parent.appendChild((buildDocument ?? document).createComment(""));
  } else if (typeof child === "string") {
    parent.appendChild((buildDocument ?? document).createTextNode(child));
  } else if (Array.isArray(child)) {
    for (const c of child) appendStatic(parent, c);
  } else if (child instanceof Node) {
    parent.appendChild(child);
  }
}

/** Builds one static element of a template. */
export function element(tag: string, props: Record<string, unknown> | null, children: unknown[] | null): Element {
  if (tag.includes("-")) sawCustomElement = true;
  const el = createElement(tag, buildDocument ?? document);
  // Children first, as mountElement does, so a prop that depends on them (a <select> value) sees them.
  if (children !== null) for (const child of children) appendStatic(el, child);
  if (props !== null) for (const key in props) bakeProp(el, key, props[key]);
  return el;
}

function pathOf(root: Node, node: Node): number[] {
  const path: number[] = [];
  let current = node;
  while (current !== root) {
    let index = 0;
    let sibling = current.previousSibling;
    while (sibling !== null) {
      index++;
      sibling = sibling.previousSibling;
    }
    path.unshift(index);
    current = current.parentNode as Node;
  }
  return path;
}

function nodeAt(root: Node, path: number[]): Element {
  let node = root;
  for (const index of path) node = node.childNodes[index];
  return node as Element;
}

// Builds the template root in `doc` (null: the live document) and lists the props to replay on
// every clone.
function buildIn(doc: Document | null, build: () => Element): [Element, Patch[] | null] {
  const pending: Array<[Element, string, unknown]> = [];
  pendingPatches = pending;
  buildDocument = doc;
  sawCustomElement = false;
  const built = build();
  return [built, pending.length > 0 ? pending.map(([el, key, value]): Patch => [pathOf(built, el), key, value]) : null];
}

/** Returns a function that clones the template `build` creates (built on first use). */
export function template(build: () => Element): () => Element {
  let root: Element | null = null;
  let patches: Patch[] | null = null;
  let live = false;
  let built = -1;
  return () => {
    if (built !== generation) {
      const outerPatches = pendingPatches;
      const outerDocument = buildDocument;
      const outerSaw = sawCustomElement;
      try {
        let result = buildIn(inert(), build);
        live = sawCustomElement;
        if (live) result = buildIn(null, build);
        [root, patches] = result;
        built = generation;
      } finally {
        pendingPatches = outerPatches;
        buildDocument = outerDocument;
        sawCustomElement = outerSaw;
      }
    }
    // A clone of a live-document template taken while another template builds forces that one
    // into the live document too, or its own clones would hold never-upgraded custom elements.
    if (live) sawCustomElement = true;
    const node = (root as Element).cloneNode(true) as Element;
    if (patches !== null) {
      for (const [path, key, value] of patches) {
        const el = nodeAt(node, path);
        setProp(el, key, value);
        // Cloned while another template is being built: that template's clones need it too.
        if (pendingPatches !== null) pendingPatches.push([el, key, value]);
        if (recording) recordProp(el, key, value, getCurrentScope());
      }
    }
    return node;
  };
}

/**
 * Returns a function that clones the tree `markup` parses to (parsed on first use). The compiler
 * emits it only for markup the parser reads back as the tree element() would build, with no custom
 * element in it, so it is parsed and cloned in the inert document like a built template.
 */
export function html(markup: string): () => Element {
  let root: Element | null = null;
  let built = -1;
  return () => {
    if (built !== generation) {
      const parser = inert().createElement("template");
      parser.innerHTML = markup;
      root = parser.content.firstChild as Element;
      built = generation;
    }
    return (root as Element).cloneNode(true) as Element;
  };
}

/** Applies a dynamic prop to a cloned element. */
export function prop(el: Element, key: string, value: unknown, scope: Scope): void {
  if (recording) recordProp(el, key, value, scope);
  applyProp(el, key, value, scope);
}

/** Binds an event prop of a compiled template element through the delegated path (dom/events). */
export function on(el: Element, key: string, value: unknown, scope: Scope): void {
  if (recording) recordProp(el, key, value, scope);
  const entry = delegatedProp(key);
  if (entry !== null) addDelegatedEvent(el, entry, value, scope);
  else applyProp(el, key, value, scope);
}

/**
 * The binding target of an event prop, resolved once per module by the compiler: the delegated
 * entry, or the key itself when `key` is not a known event (it is then bound as a plain prop).
 */
export function event(key: string): DelegatedType | string {
  return delegatedProp(key) ?? key;
}

/** Binds an event prop through the target `event()` resolved, with no lookup per binding. */
export function onEvent(el: Element, target: DelegatedType | string, value: unknown, scope: Scope): void {
  if (typeof target === "string") {
    prop(el, target, value, scope);
    return;
  }
  if (recording) recordProp(el, target.key, value, scope);
  addDelegatedEvent(el, target, value, scope);
}

/**
 * Binds a reactive `class` (or `className`) prop: the compiler emits it for a function literal
 * value, which applyProp would bind the same way after its key checks.
 */
export function className(el: Element, read: () => unknown, scope: Scope): void {
  if (recording) recordProp(el, "class", read, scope);
  bindClass(el, read, scope);
}

/** Mounts a reactive child before its marker comment from the template. */
export function reactive(marker: Node, fn: () => unknown, scope: Scope): void {
  mountReactive(marker.parentNode as Node, fn, scope, marker);
}

/**
 * Binds a reactive child that is the only content of `parent`, which the template leaves empty: no
 * anchor comment is needed. Templates compiled by earlier versions hold an empty text node there,
 * which a text result takes over; a hydration build pass gets one too, as mountReactive registers
 * fresh nodes of other results only.
 */
export function reactiveOnly(parent: Node, fn: () => unknown, scope: Scope): void {
  let placeholder: Text | null = null;
  if (parent.hasChildNodes()) placeholder = parent.firstChild as Text;
  else if (recording) placeholder = parent.appendChild(document.createTextNode(""));
  mountReactive(parent, fn, scope, null, placeholder);
}

/** Inserts the only child of `parent`, which the template leaves empty. */
export function insertOnly(parent: Node, value: unknown, scope: Scope): void {
  // textContent builds the text node without a JS wrapper for it. An empty string still gets its
  // (empty) text node, as mountChildren gives it one.
  if ((typeof value === "string" && value !== "") || typeof value === "number") {
    parent.textContent = value as string;
    return;
  }
  mountChildren(parent, value, scope);
}

/** Inserts a dynamic child before `before`, or at the end of `parent` when it is null. */
export function insert(parent: Node, value: unknown, before: Node | null, scope: Scope): void {
  if (before === null) {
    mountChildren(parent, value, scope);
  } else if (typeof value === "function") {
    const end = parent.insertBefore(document.createComment(""), before);
    mountReactive(parent, value as () => unknown, scope, end);
  } else if (value instanceof Node) {
    parent.insertBefore(value, before);
  } else if (typeof value === "string" || typeof value === "number") {
    (before as ChildNode).before(String(value));
  } else if (Array.isArray(value)) {
    // Each item goes straight in front of `before`, in order: no fragment to fill and empty again.
    for (const item of value) insert(parent, item, before, scope);
  }
}

export { getCurrentScope as scope };
