import ts from "typescript";

import { MappedOutput, type SourceMapV3 } from "./mapped-output.js";

import type { Plugin } from "vite";

// Compiles JSX trees of host elements into cloned templates. The static part of a tree (tags,
// literal attributes, text, the anchors of reactive children) is built once by the runtime, from
// markup when the parser provably builds the same tree (see HTML templates below), otherwise with the
// same DOM calls jsx() makes; each render clones it with one cloneNode(true) and binds only the
// dynamic parts, reached by walking firstChild/nextSibling before anything is inserted. A lone
// element is worth a template when it has something static to clone (attributes, text) or a
// reactive child, which then needs no anchor comment. Trees with spread attributes, an explicit
// `children` attribute, unknown HTML entities or `await`/`yield` inside an expression are left to
// jsx().

export const JSX_FILE = /\.[jt]sx(?:$|\?)/;
const P = "_$px";
const HELPERS = [
  "template", "html", "element", "prop", "reactive", "insert", "reactiveOnly", "insertOnly", "scope", "event",
  "onEvent", "className",
] as const;
const EVENT_PROP = /^on[A-Z]/;

type JsxEl = ts.JsxElement | ts.JsxSelfClosingElement;

interface ElementModel {
  kind: "element";
  node: JsxEl;
  tag: string;
  statics: Array<[name: string, code: string]>;
  props: Array<[name: string, value: ts.Expression]>;
  children: ChildModel[];
  ref?: string;
}

interface TextModel {
  kind: "text";
  value: string;
}

interface SlotModel {
  kind: "slot";
  /** The expression, or the JSX element/fragment that is inserted as is. */
  value: ts.Node;
  /** An arrow or function literal: always reactive, so it gets an anchor in the template. */
  reactive: boolean;
  /** The element's only child: the template holds an empty text node for it instead of an anchor. */
  sole?: boolean;
  ref?: string;
}

type ChildModel = ElementModel | TextModel | SlotModel;

interface Root {
  start: number;
  end: number;
  model: ElementModel;
  /** Sits where JSX children go, so the emitted expression needs braces. */
  braces: boolean;
  /**
   * Where the tree's value goes when it is emitted as statements: "arrow" for the whole expression
   * body of an arrow function (its parentheses included in start/end), "return" for the operand of
   * a return statement (the statement included). "expression" otherwise.
   */
  position: "arrow" | "return" | "expression";
}

// ── JSX text and entities ────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", copy: "©", reg: "®",
  trade: "™", hellip: "…", mdash: "—", ndash: "–", laquo: "«", raquo: "»",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", middot: "·", bull: "•",
  times: "×", divide: "÷", deg: "°", euro: "€", larr: "←", rarr: "→",
  uarr: "↑", darr: "↓", check: "✓", hearts: "♥", zwj: "‍", zwnj: "‌",
  shy: "­", ensp: " ", emsp: " ", thinsp: " ",
};

const ENTITY = /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/** Decodes the entities JSX allows; null when one isn't known here, so the tree stays on jsx(). */
export function decodeEntities(text: string): string | null {
  if (!text.includes("&")) return text;
  for (const [, body] of text.matchAll(ENTITY)) {
    if (!body.startsWith("#") && !(body in ENTITIES)) return null;
  }
  return text.replace(ENTITY, (_match, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(parseInt(body.slice(1), 10));
    return ENTITIES[body];
  });
}

/**
 * JSX whitespace rules, as the JSX transform applies them (oxc's, which jsx() output goes through):
 * lines are trimmed of spaces and tabs at their inner edges, lines of only whitespace drop, and the
 * remaining lines are joined with one space. Tabs inside a line are kept.
 */
export function cleanJsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  for (let i = 0; i < lines.length; i++) if (/[^ \t]/.test(lines[i])) lastNonEmpty = i;
  let out = "";
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i !== 0) line = line.replace(/^[ \t]+/, "");
    if (i !== lines.length - 1) line = line.replace(/[ \t]+$/, "");
    if (line === "") continue;
    if (i !== lastNonEmpty) line += " ";
    out += line;
  }
  return out;
}

// ── model ────────────────────────────────────────────────────────────────────

function openingOf(node: JsxEl): ts.JsxOpeningLikeElement {
  return ts.isJsxElement(node) ? node.openingElement : node;
}

function hostTag(node: JsxEl): string | null {
  const name = openingOf(node).tagName;
  if (!ts.isIdentifier(name)) return null;
  const tag = name.text;
  return /^[a-z]/.test(tag) ? tag : null;
}

function attributeName(attr: ts.JsxAttribute): string {
  const name = attr.name;
  return ts.isIdentifier(name) ? name.text : `${name.namespace.text}:${name.name.text}`;
}

function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function literalCode(expr: ts.Expression, source: ts.SourceFile): string | null {
  const node = unwrap(expr);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return JSON.stringify(node.text);
  if (ts.isNumericLiteral(node)) return node.getText(source);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return "true";
  if (node.kind === ts.SyntaxKind.FalseKeyword) return "false";
  if (node.kind === ts.SyntaxKind.NullKeyword) return "null";
  return null;
}

function literalText(expr: ts.Expression): string | null {
  const node = unwrap(expr);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return String(Number(node.text));
  return null;
}

// An `await` or `yield` would be moved into the arrow that binds the clone, where it isn't valid.
function suspends(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isAwaitExpression(child) || ts.isYieldExpression(child)) {
      found = true;
      return;
    }
    if (ts.isFunctionLike(child) || ts.isClassLike(child)) return;
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

// Set when a tree contains something a template cannot express; the tree then stays on jsx().
let bailed = false;

function model(node: JsxEl, source: ts.SourceFile): ElementModel | null {
  const tag = hostTag(node);
  if (tag === null) return null;
  const statics: ElementModel["statics"] = [];
  const props: ElementModel["props"] = [];
  for (const attr of openingOf(node).attributes.properties) {
    if (!ts.isJsxAttribute(attr)) return null;
    const name = attributeName(attr);
    if (name === "children") return null;
    if (name === "key") continue;
    const init = attr.initializer;
    if (init === undefined) {
      statics.push([name, "true"]);
    } else if (ts.isStringLiteral(init)) {
      const raw = init.getText(source).slice(1, -1);
      const value = decodeEntities(raw);
      if (value === null) bailed = true;
      statics.push([name, JSON.stringify(value)]);
    } else if (ts.isJsxExpression(init)) {
      if (init.expression === undefined) continue;
      if (suspends(init.expression)) bailed = true;
      const code = literalCode(init.expression, source);
      if (code !== null) statics.push([name, code]);
      else props.push([name, init.expression]);
    } else {
      // A JSX element as an attribute value.
      props.push([name, init as unknown as ts.Expression]);
    }
  }

  const children: ChildModel[] = [];
  if (ts.isJsxElement(node)) {
    for (const child of node.children) {
      if (ts.isJsxText(child)) {
        // The node's full range: getText() starts after leading whitespace, which JSX keeps when the
        // line holds anything else (`a <b /> c` keeps the space before `c`).
        const cleaned = cleanJsxText(source.text.slice(child.pos, child.end));
        if (cleaned === "") continue;
        const value = decodeEntities(cleaned);
        if (value === null) bailed = true;
        else children.push({ kind: "text", value });
      } else if (ts.isJsxExpression(child)) {
        if (child.expression === undefined) continue;
        if (suspends(child.expression)) bailed = true;
        const text = child.dotDotDotToken === undefined ? literalText(child.expression) : null;
        if (text !== null) {
          children.push({ kind: "text", value: text });
          continue;
        }
        const expr = unwrap(child.expression);
        const reactive = child.dotDotDotToken === undefined && (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr));
        children.push({ kind: "slot", value: child.expression, reactive });
      } else if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
        const nested = model(child, source);
        children.push(nested ?? { kind: "slot", value: child, reactive: false });
      } else {
        children.push({ kind: "slot", value: child, reactive: false });
      }
    }
  }
  if (children.length === 1 && children[0].kind === "slot") children[0].sole = true;
  return { kind: "element", node, tag, statics, props, children };
}

function takeBail(): boolean {
  const value = bailed;
  bailed = false;
  return value;
}

function worthTemplate(m: ElementModel): boolean {
  if (m.statics.length > 0) return true;
  return m.children.some((c) => c.kind !== "slot" || c.reactive);
}

function tryModel(node: JsxEl, source: ts.SourceFile): ElementModel | null {
  takeBail();
  const m = model(node, source);
  if (takeBail()) return null;
  return m !== null && worthTemplate(m) ? m : null;
}

function dynamicNodes(m: ElementModel, out: ts.Node[]): void {
  for (const child of m.children) {
    if (child.kind === "element") dynamicNodes(child, out);
    else if (child.kind === "slot") out.push(child.value);
  }
  for (const [, value] of m.props) out.push(value);
}

function collectRoots(source: ts.SourceFile): Root[] {
  const roots: Root[] = [];
  // `moved`: the node is a dynamic part of a template, re-emitted as an argument of a binding call,
  // so a tree there is an expression even when it sat in a JSX attribute.
  const visit = (node: ts.Node, moved: boolean): void => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const m = tryModel(node, source);
      if (m !== null) {
        const parent = node.parent;
        let outer: ts.Node = node;
        while (ts.isParenthesizedExpression(outer.parent)) outer = outer.parent;
        const host = outer.parent;
        const position = ts.isArrowFunction(host) && host.body === outer
          ? "arrow"
          : ts.isReturnStatement(host) && host.expression === outer ? "return" : "expression";
        const span = position === "arrow" ? outer : position === "return" ? host : node;
        roots.push({
          start: span.getStart(source),
          end: span.getEnd(),
          model: m,
          braces: !moved && (ts.isJsxElement(parent) || ts.isJsxFragment(parent) || ts.isJsxAttribute(parent)),
          position,
        });
        const nested: ts.Node[] = [];
        dynamicNodes(m, nested);
        for (const n of nested) visit(n, true);
        return;
      }
    }
    ts.forEachChild(node, (child) => { visit(child, false); });
  };
  visit(source, false);
  return roots.sort((a, b) => a.start - b.start);
}

// ── emit ─────────────────────────────────────────────────────────────────────

/**
 * The template's static nodes: elements, text and the anchors of reactive slots. A reactive slot
 * that is the only child needs no anchor: it fills its parent.
 */
function templateChildren(m: ElementModel): ChildModel[] {
  return m.children.filter((c) => c.kind !== "slot" || (c.reactive && c.sole !== true));
}

function builderCode(m: ElementModel): string {
  const props = m.statics.length === 0
    ? "null"
    : `{ ${m.statics.map(([name, code]) => `${JSON.stringify(name)}: ${code}`).join(", ")} }`;
  const children = templateChildren(m).map((c) => {
    if (c.kind === "element") return builderCode(c);
    if (c.kind === "text") return JSON.stringify(c.value);
    return "0";
  });
  return `${P}element(${JSON.stringify(m.tag)}, ${props}, ${children.length === 0 ? "null" : `[${children.join(", ")}]`})`;
}

// ── HTML templates ───────────────────────────────────────────────────────────
//
// A template whose static part the HTML parser reads back as exactly the tree element() would build
// is emitted as markup instead: shorter in the bundle, and one parse in place of a DOM call per node.
// That holds only within rules the parser cannot bend, so every tree outside them keeps the builder:
// known HTML elements only (no custom element, SVG, form control state, raw text or select), no
// element the parser would close or move (nested p content, lists, tables, headings, links,
// buttons, forms), no text it would merge, drop or foster-parent, and attributes whose property, when
// element() sets it, writes the same attribute the markup holds.

// Elements the parser treats specially for p/li/dd/dt closing (the "special" category).
const SPECIAL = new Set([
  "address", "article", "aside", "blockquote", "br", "button", "caption", "col", "colgroup", "dd", "details",
  "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4",
  "h5", "h6", "header", "hgroup", "hr", "img", "input", "li", "main", "menu", "nav", "ol", "p", "pre",
  "search", "section", "source", "summary", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul", "wbr",
]);

const PHRASING = new Set([
  "a", "abbr", "b", "bdi", "bdo", "br", "button", "cite", "code", "data", "dfn", "em", "i", "img", "input",
  "kbd", "label", "mark", "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr",
  "meter", "progress", "output", "del", "ins",
]);

const HTML_TAGS = new Set([
  ...SPECIAL, ...PHRASING, "dialog", "legend", "picture", "canvas",
]);

const VOID = new Set(["br", "col", "hr", "img", "input", "source", "wbr"]);

// Children each table part accepts; text inside them would be moved out of the table.
const TABLE_CHILDREN: Record<string, ReadonlySet<string>> = {
  table: new Set(["caption", "colgroup", "thead", "tbody", "tfoot"]),
  thead: new Set(["tr"]),
  tbody: new Set(["tr"]),
  tfoot: new Set(["tr"]),
  tr: new Set(["td", "th"]),
  colgroup: new Set(["col"]),
};
const TABLE_PARTS = new Set(["caption", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "td", "th"]);

// Attributes whose property (when the element has one) reflects exactly the string it is set to,
// and attributes no element has a property for. Names with a dash have no property either.
const STRING_ATTRS = new Set([
  "id", "class", "title", "lang", "dir", "role", "href", "src", "alt", "rel", "target", "name", "type",
  "placeholder", "for", "tabindex", "colspan", "rowspan", "slot", "style", "autocomplete", "action",
  "method", "min", "max", "step", "pattern", "accept", "label", "scope", "loading", "decoding", "download",
]);
// Boolean attributes whose property, set to true, adds the empty attribute.
const BOOLEAN_ATTRS = new Set([
  "disabled", "hidden", "required", "multiple", "autofocus", "readonly", "novalidate", "formnovalidate",
  "reversed", "inert",
]);

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\r/g, "&#13;");
}

function attributeCode(name: string, value: string): string {
  if (value !== "" && /^[^\s"'=<>`&]+$/.test(value)) return `${name}=${value}`;
  return `${name}="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\r/g, "&#13;")}"`;
}

function markupName(key: string): string {
  return key === "className" ? "class" : key === "htmlFor" ? "for" : key;
}

// The markup of one static attribute, "" when it is left out, or null when it is not safe.
function attributeHtml(key: string, code: string): string | null {
  const name = markupName(key);
  const dashed = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(name);
  if (!dashed && !STRING_ATTRS.has(name) && !BOOLEAN_ATTRS.has(name)) return null;
  if (code === "true") return dashed || BOOLEAN_ATTRS.has(name) ? name : null;
  if (code === "false" || code === "null") return dashed || BOOLEAN_ATTRS.has(name) ? "" : null;
  if (BOOLEAN_ATTRS.has(name)) return null;
  const text = code.startsWith("\"") ? JSON.parse(code) as string : String(Number(code.replace(/_/g, "")));
  return unsafeText(text) ? null : attributeCode(name, text);
}

// The parser drops \0, and lone surrogates are not kept the same way by every DOM.
function unsafeText(text: string): boolean {
  return /[\0\uD800-\uDFFF]/.test(text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ""));
}

// An li (or dd/dt) start tag closes an open one unless a special element other than address, div
// or p sits between them.
function closesOpenItem(ancestors: string[], items: string[]): boolean {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const tag = ancestors[i];
    if (items.includes(tag)) return true;
    if (SPECIAL.has(tag) && tag !== "address" && tag !== "div" && tag !== "p") return false;
  }
  return false;
}

/** `ancestors`: the tags around `m` in the template, outermost first. */
function elementHtml(m: ElementModel, ancestors: string[]): string | null {
  const { tag } = m;
  const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
  if (!HTML_TAGS.has(tag)) return null;
  // Everything inside a p must be phrasing content, or the parser closes the p early.
  if (ancestors.includes("p") && !PHRASING.has(tag)) return null;
  if ((tag === "a" || tag === "button" || tag === "form") && ancestors.includes(tag)) return null;
  if (/^h[1-6]$/.test(tag) && parent !== null && /^h[1-6]$/.test(parent)) return null;
  if (tag === "li" && closesOpenItem(ancestors, ["li"])) return null;
  if ((tag === "dd" || tag === "dt") && closesOpenItem(ancestors, ["dd", "dt"])) return null;
  if (TABLE_PARTS.has(tag)) {
    // A table part goes where the table model puts it: at the root of the template, or under its parent.
    const allowed = parent === null ? true : TABLE_CHILDREN[parent] as ReadonlySet<string> | undefined;
    if (allowed !== true && allowed?.has(tag) !== true) return null;
  } else if (parent !== null && parent in TABLE_CHILDREN) {
    return null;
  }

  let open = `<${tag}`;
  const seen = new Set<string>();
  for (const [key, code] of m.statics) {
    const name = markupName(key);
    // element() lets a later value win, the parser keeps the first one.
    if (seen.has(name)) return null;
    seen.add(name);
    const attr = attributeHtml(key, code);
    if (attr === null) return null;
    if (attr !== "") open += ` ${attr}`;
  }
  open += ">";

  const children = templateChildren(m);
  if (VOID.has(tag)) return children.length === 0 ? open : null;
  if (tag === "pre" && children[0]?.kind === "text" && /^[\n\r]/.test(children[0].value)) return null;
  let inner = "";
  const nested = [...ancestors, tag];
  let previousText = false;
  for (const child of children) {
    if (child.kind === "element") {
      const html = elementHtml(child, nested);
      if (html === null) return null;
      inner += html;
      previousText = false;
    } else if (child.kind === "text") {
      // Adjacent texts would be one node, an empty one none, and text in a table part moves out.
      if (previousText || child.value === "" || tag in TABLE_CHILDREN || unsafeText(child.value)) return null;
      inner += escapeText(child.value);
      previousText = true;
    } else {
      inner += "<!---->";
      previousText = false;
    }
  }
  return `${open}${inner}</${tag}>`;
}

/** The markup of a template's static part, or null when only element() builds it faithfully. */
export function templateHtml(m: ElementModel): string | null {
  const html = elementHtml(m, []);
  // The parser closes every element still open at the end of the input.
  return html === null ? null : html.replace(/(?:<\/[a-z0-9]+>)+$/, "");
}

function isFunctionLiteral(node: ts.Expression): boolean {
  const expr = unwrap(node);
  return ts.isArrowFunction(expr) || ts.isFunctionExpression(expr);
}

class Emitter {
  private readonly templates: string[] = [];
  /** One hoisted binding target per event prop name used in the module. */
  private readonly events = new Map<string, string>();
  private counter = 0;

  constructor(
    private readonly out: MappedOutput,
    private readonly roots: Root[],
    private readonly source: ts.SourceFile,
  ) {}

  hoisted(): string {
    let events = "";
    for (const [name, id] of this.events) events += `const ${id} = /* @__PURE__ */ ${P}event(${JSON.stringify(name)});\n`;
    return events + this.templates.join("");
  }

  private eventTarget(name: string): string {
    let id = this.events.get(name);
    if (id === undefined) {
      id = `${P}e${String(this.events.size)}`;
      this.events.set(name, id);
    }
    return id;
  }

  range(from: number, to: number): void {
    let cursor = from;
    for (const root of this.roots) {
      if (root.start < cursor || root.end > to) continue;
      this.out.copy(cursor, root.start);
      this.root(root);
      cursor = root.end;
    }
    this.out.copy(cursor, to);
  }

  private node(node: ts.Node): void {
    this.range(node.getStart(this.source), node.getEnd());
  }

  private root(root: Root): void {
    const { model: m } = root;
    const id = `${P}T${String(this.templates.length)}`;
    const html = templateHtml(m);
    this.templates.push(html === null
      ? `const ${id} = /* @__PURE__ */ ${P}template(() => ${builderCode(m)});\n`
      : `const ${id} = /* @__PURE__ */ ${P}html(${JSON.stringify(html)});\n`);
    this.counter = 0;
    const refs: string[] = [];
    const rootVar = `${P}r`;
    m.ref = rootVar;
    const needed = this.assignRefs(m, refs);
    const at = root.start;
    const open = root.braces ? "{" : "";
    const close = root.braces ? "}" : "";
    if (!needed) {
      this.out.insert(root.position === "return" ? `return ${id}();` : `${open}${id}()${close}`, at);
      return;
    }
    // An arrow function's body or a returned tree becomes statements in a block: no closure to
    // create and call on every run, which a row renderer or a component's render() would pay.
    if (root.position !== "expression") {
      this.out.insert(`{ const ${P}s = ${P}scope(); const ${rootVar} = ${id}(); ${refs.join(" ")} `, at);
      this.ops(m);
      this.out.insert(`return ${rootVar}; }`, root.end);
      return;
    }
    this.out.insert(`${open}((${P}s) => { const ${rootVar} = ${id}(); ${refs.join(" ")} `, at);
    this.ops(m);
    this.out.insert(`return ${rootVar}; })(${P}scope())${close}`, root.end);
  }

  /** Names the nodes the bindings need and emits the walk to them; true if anything is dynamic. */
  private assignRefs(m: ElementModel, refs: string[]): boolean {
    const nodes = templateChildren(m);
    const wanted = new Set<ChildModel>();
    let dynamic = m.props.length > 0;
    // Non-reactive slots insert before the next static node, or append when none follows.
    for (let i = 0; i < m.children.length; i++) {
      const child = m.children[i];
      if (child.kind !== "slot") continue;
      dynamic = true;
      if (child.sole === true) continue;
      if (child.reactive) {
        wanted.add(child);
        continue;
      }
      for (let j = i + 1; j < m.children.length; j++) {
        const next = m.children[j];
        if (next.kind !== "slot" || next.reactive) {
          wanted.add(next);
          break;
        }
      }
    }
    for (const child of nodes) {
      if (child.kind === "element" && this.subtreeDynamic(child)) wanted.add(child);
    }
    if (!dynamic && wanted.size === 0) return false;

    let base = `${m.ref as string}.firstChild`;
    let baseIndex = 0;
    for (let i = 0; i < nodes.length; i++) {
      const child = nodes[i];
      if (!wanted.has(child)) continue;
      const name = `${P}n${String(this.counter++)}`;
      refs.push(`const ${name} = ${base}${".nextSibling".repeat(i - baseIndex)};`);
      (child as ElementModel | SlotModel).ref = name;
      base = `${name}.nextSibling`;
      baseIndex = i + 1;
      if (child.kind === "text") (child as TextModel & { ref?: string }).ref = name;
    }
    for (const child of nodes) {
      if (child.kind === "element" && wanted.has(child)) this.assignRefs(child, refs);
    }
    return true;
  }

  private subtreeDynamic(m: ElementModel): boolean {
    if (m.props.length > 0) return true;
    for (const child of m.children) {
      if (child.kind === "slot") return true;
      if (child.kind === "element" && this.subtreeDynamic(child)) return true;
    }
    return false;
  }

  // Children before their parent's props, so a parent binding (a <select> value, a ref) sees its
  // children in place.
  private ops(m: ElementModel): void {
    for (let i = 0; i < m.children.length; i++) {
      const child = m.children[i];
      if (child.kind === "element") {
        if (this.subtreeDynamic(child)) this.ops(child);
        continue;
      }
      if (child.kind === "text") continue;
      const start = child.value.getStart(this.source);
      if (child.sole === true) {
        this.out.insert(`${P}${child.reactive ? "reactiveOnly" : "insertOnly"}(${m.ref as string}, `, start);
        this.node(child.value);
        this.out.insert(`, ${P}s); `, child.value.getEnd());
        continue;
      }
      if (child.reactive) {
        this.out.insert(`${P}reactive(${child.ref as string}, `, start);
        this.node(child.value);
        this.out.insert(`, ${P}s); `, child.value.getEnd());
        continue;
      }
      let before = "null";
      for (let j = i + 1; j < m.children.length; j++) {
        const next = m.children[j];
        if (next.kind !== "slot" || next.reactive) {
          before = (next as { ref?: string }).ref as string;
          break;
        }
      }
      this.out.insert(`${P}insert(${m.ref as string}, `, start);
      this.node(child.value);
      this.out.insert(`, ${before}, ${P}s); `, child.value.getEnd());
    }
    // className() records under "class" for hydration: with both keys reactive on one element, one
    // record would overwrite the other, so that pair stays on prop().
    const classKeys = m.props.filter(([name, value]) => (name === "class" || name === "className") && isFunctionLiteral(value));
    for (const [name, value] of m.props) {
      const start = value.getStart(this.source);
      const ref = m.ref as string;
      if (EVENT_PROP.test(name)) {
        // Event props bind through the runtime's delegated path: no listener per element at render.
        this.out.insert(`${P}onEvent(${ref}, ${this.eventTarget(name)}, `, start);
      } else if (classKeys.length === 1 && classKeys[0][0] === name) {
        this.out.insert(`${P}className(${ref}, `, start);
      } else {
        this.out.insert(`${P}prop(${ref}, ${JSON.stringify(name)}, `, start);
      }
      this.node(value);
      this.out.insert(`, ${P}s); `, value.getEnd());
    }
  }
}

export interface TemplateResult {
  code: string;
  map: SourceMapV3;
}

/** Compiles every eligible host-element JSX tree in a file; null when there is none. */
export function transformTemplates(code: string, fileName: string): TemplateResult | null {
  if (!code.includes("<")) return null;
  const kind = fileName.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, kind);
  const roots = collectRoots(source);
  if (roots.length === 0) return null;

  const body = new MappedOutput(code);
  const emitter = new Emitter(body, roots, source);
  emitter.range(0, code.length);

  const imports = `import { ${HELPERS.map((h) => `_$${h} as ${P}${h}`).join(", ")} } from "@praxisjs/runtime";\n`;
  const out = new MappedOutput(code);
  out.insert(imports + emitter.hoisted(), 0);
  const result = body.result(fileName);
  return prepend(out.result(fileName), result);
}

// The hoisted header is generated text with no source: it shifts every mapped line down by its
// own line count, which in VLQ terms is a run of empty line entries in front of the body's.
function prepend(header: TemplateResult, body: TemplateResult): TemplateResult {
  const headerLines = header.code.split("\n").length - 1;
  return {
    code: header.code + body.code,
    map: { ...body.map, mappings: ";".repeat(headerLines) + body.map.mappings },
  };
}

export interface TemplatesPluginOptions {
  /**
   * Restricts the transform to matching module ids. Default: every .jsx/.tsx outside node_modules,
   * and those of the libraries that opt in.
   */
  include?: RegExp;
}

/** `isLibrary` tells the files of the dependencies compiled like the app's own code. */
export function templatesPlugin(options: TemplatesPluginOptions = {}, isLibrary?: (id: string) => boolean): Plugin {
  const include = options.include ?? JSX_FILE;
  return {
    name: "praxisjs:templates",
    enforce: "pre",
    transform(code, id) {
      if (!include.test(id) || (id.includes("/node_modules/") && isLibrary?.(id) !== true)) return null;
      const result = transformTemplates(code, id.split("?")[0]);
      return result === null ? null : { code: result.code, map: result.map };
    },
  };
}
