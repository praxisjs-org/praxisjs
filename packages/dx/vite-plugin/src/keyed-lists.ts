import ts from "typescript";

import { MappedOutput, type SourceMapV3 } from "./mapped-output.js";

import type { Plugin } from "vite";

export { encodeVlq, type SourceMapV3 } from "./mapped-output.js";

const JSX_FILE = /\.[jt]sx(?:$|\?)/;
const FOR_BINDING = "__PraxisFor";
const ITEM = "__praxisItem";
const INDEX = "__praxisIndex";
const KEY_GLOBALS = new Set(["String", "Number", "JSON", "Math", "undefined"]);

interface Match {
  start: number;
  end: number;
  /** Keep the child a function: the parent is a component (it may call it) or a fragment. */
  wrap: boolean;
  receiver: ts.Expression;
  params: readonly ts.ParameterDeclaration[];
  key: ts.Expression;
  element: ts.JsxElement | ts.JsxSelfClosingElement;
}

export interface KeyedListWarning {
  message: string;
  line: number;
  column: number;
}

export interface KeyedListResult {
  code: string;
  map: SourceMapV3 | null;
  warnings: KeyedListWarning[];
}


function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function rootTag(element: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxOpeningLikeElement {
  return ts.isJsxElement(element) ? element.openingElement : element;
}

function keyAttribute(element: ts.JsxElement | ts.JsxSelfClosingElement): ts.JsxAttribute | undefined {
  for (const prop of rootTag(element).attributes.properties) {
    if (ts.isJsxAttribute(prop) && ts.isIdentifier(prop.name) && prop.name.text === "key") return prop;
  }
  return undefined;
}

// Only the attributes of the elements the callback can return count: a `key` deeper in a row belongs
// to a nested list, not to this one.
function hasKeyAttribute(node: ts.Node): boolean {
  let found = false;
  const visit = (child: ts.Node): void => {
    if (found) return;
    if (ts.isJsxAttribute(child) && ts.isIdentifier(child.name) && child.name.text === "key") {
      found = true;
      return;
    }
    if (ts.isJsxElement(child)) {
      visit(child.openingElement);
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function boundNames(name: ts.BindingName, out: Set<string>): void {
  if (ts.isIdentifier(name)) {
    out.add(name.text);
    return;
  }
  for (const element of name.elements) {
    if (ts.isBindingElement(element)) boundNames(element.name, out);
  }
}

// Identifiers that are references (not property names, not object literal keys).
function isReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  return true;
}

// The key function runs untracked, once per item, outside the original arrow: it may only depend
// on the callback's own parameters, or moving it would change what it computes.
function keyDependsOnlyOnParams(key: ts.Expression, params: Set<string>): boolean {
  let ok = true;
  const visit = (node: ts.Node): void => {
    if (!ok || ts.isTypeNode(node)) return;
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      ok = false;
      return;
    }
    if (ts.isIdentifier(node) && isReference(node) && !params.has(node.text) && !KEY_GLOBALS.has(node.text)) {
      ok = false;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(key);
  return ok;
}

type Candidate = { match: Match } | { reason: string } | null;

// Under an intrinsic element a function child is only ever mounted as a reactive child, so it can
// become the <For> element itself. A component may call a function child (render props), and
// fragments treat children differently, so there the rewrite stays a function returning the <For>.
function isIntrinsicParent(parent: ts.Node): boolean {
  if (!ts.isJsxElement(parent)) return false;
  const tag = parent.openingElement.tagName;
  return ts.isIdentifier(tag) && /^[a-z]/.test(tag.text);
}

function matchList(container: ts.JsxExpression): Candidate {
  const expression = container.expression;
  if (expression === undefined || !ts.isArrowFunction(expression)) return null;
  if (expression.parameters.length > 0 || ts.isBlock(expression.body)) return null;

  const call = unwrap(expression.body);
  if (!ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression)) return null;
  if (call.expression.name.text !== "map") return null;
  const callback = call.arguments[0] as ts.Expression | undefined;
  if (callback === undefined || !hasKeyAttribute(callback)) return null;

  if (call.arguments.length !== 1 || call.typeArguments !== undefined) {
    return { reason: "`.map()` is called with more than one argument or with type arguments" };
  }
  if (!ts.isArrowFunction(callback)) {
    return { reason: "the `.map()` callback is not an arrow function" };
  }
  if (callback.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) === true) {
    return { reason: "the `.map()` callback is async" };
  }
  const params = callback.parameters;
  if (params.length < 1 || params.length > 2 || params.some((p) => p.dotDotDotToken !== undefined || p.initializer !== undefined)) {
    return { reason: "the `.map()` callback must take (item) or (item, index), without defaults or rest parameters" };
  }
  if (ts.isBlock(callback.body)) {
    return { reason: "the `.map()` callback has a block body; return the element directly" };
  }
  const element = unwrap(callback.body);
  if (!ts.isJsxElement(element) && !ts.isJsxSelfClosingElement(element)) {
    return { reason: "the `.map()` callback does not return a single JSX element" };
  }
  const attribute = keyAttribute(element);
  if (attribute === undefined) {
    return { reason: "`key` is not on the element the callback returns" };
  }
  const initializer = attribute.initializer;
  if (initializer === undefined || !ts.isJsxExpression(initializer) || initializer.expression === undefined) {
    return { reason: "`key` is a constant; every row would share it" };
  }
  const names = new Set<string>();
  for (const param of params) boundNames(param.name, names);
  if (!keyDependsOnlyOnParams(initializer.expression, names)) {
    return { reason: "`key` reads something other than the callback's parameters" };
  }
  return {
    match: {
      start: container.getStart(),
      end: container.getEnd(),
      wrap: !isIntrinsicParent(container.parent),
      receiver: call.expression.expression,
      params,
      key: initializer.expression,
      element,
    },
  };
}

// ── rewrite ──────────────────────────────────────────────────────────────────

function emitRange(out: MappedOutput, matches: Match[], from: number, to: number, source: ts.SourceFile): void {
  let cursor = from;
  for (const match of matches) {
    if (match.start < cursor || match.end > to) continue;
    out.copy(cursor, match.start);
    emitMatch(out, matches, match, source);
    cursor = match.end;
  }
  out.copy(cursor, to);
}

function emitMatch(out: MappedOutput, matches: Match[], match: Match, source: ts.SourceFile): void {
  const { receiver, params, key, element } = match;
  const paramsStart = params[0].getStart(source);
  const paramsEnd = params[params.length - 1].getEnd();

  out.insert(`${match.wrap ? "{() => " : ""}<${FOR_BINDING} each={() => (`, match.start);
  out.copy(receiver.getStart(source), receiver.getEnd());
  out.insert(")} by={(", receiver.getEnd());
  out.copy(paramsStart, paramsEnd);
  out.insert(") => (", paramsEnd);
  out.copy(key.getStart(source), key.getEnd());
  out.insert(`)}>{(${ITEM}${params.length > 1 ? `, ${INDEX}` : ""}) => () => { const `, key.getEnd());
  out.copy(params[0].name.getStart(source), params[0].name.getEnd());
  out.insert(` = ${ITEM}(); `, params[0].name.getEnd());
  if (params.length > 1) {
    out.insert("const ", params[1].getStart(source));
    out.copy(params[1].name.getStart(source), params[1].name.getEnd());
    out.insert(` = ${INDEX}(); `, params[1].name.getEnd());
  }
  out.insert("return (", element.getStart(source));
  emitRange(out, matches, element.getStart(source), element.getEnd(), source);
  out.insert(`); }}</${FOR_BINDING}>${match.wrap ? "}" : ""}`, match.end);
}

/**
 * Rewrites `{() => list.map((item) => <Row key={item.id} … />)}` into the equivalent `<For>`, so a
 * keyed `.map()` reuses rows instead of rebuilding the whole list on every change. Each row re-renders
 * on its own when its item, its index (if the callback takes one) or anything else it reads changes,
 * which is what the original arrow did for the whole list. Anything that doesn't match the pattern
 * exactly is left alone; keyed `.map()` calls that can't be rewritten produce a warning.
 */
export function transformKeyedLists(code: string, fileName: string): KeyedListResult | null {
  if (!code.includes(".map") || !code.includes("key")) return null;
  const kind = fileName.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, kind);

  const matches: Match[] = [];
  const warnings: KeyedListWarning[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxExpression(node) && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      const candidate = matchList(node);
      if (candidate !== null && "match" in candidate) matches.push(candidate.match);
      else if (candidate !== null) {
        const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
        warnings.push({
          line: line + 1,
          column: character + 1,
          message:
            `keyed \`.map()\` left as is (${candidate.reason}): the whole list is rebuilt whenever it changes. ` +
            "Use <For each={…} by={…}> from @praxisjs/runtime to keep rows.",
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  if (matches.length === 0) return warnings.length > 0 ? { code, map: null, warnings } : null;

  const out = new MappedOutput(code);
  out.insert(`import { For as ${FOR_BINDING} } from "@praxisjs/runtime";\n`, 0);
  emitRange(out, matches, 0, code.length, source);
  return { ...out.result(fileName), warnings };
}

export interface KeyedListsPluginOptions {
  /** Report keyed `.map()` calls that couldn't be rewritten. Default `true`. */
  warn?: boolean;
}

export function keyedListsPlugin(options: KeyedListsPluginOptions = {}): Plugin {
  const { warn = true } = options;
  return {
    name: "praxisjs:keyed-lists",
    enforce: "pre",
    transform(code, id) {
      if (!JSX_FILE.test(id) || id.includes("/node_modules/")) return null;
      const fileName = id.split("?")[0];
      const result = transformKeyedLists(code, fileName);
      if (result === null) return null;
      if (warn) {
        for (const w of result.warnings) this.warn(`${fileName}:${String(w.line)}:${String(w.column)} ${w.message}`);
      }
      if (result.map === null) return null;
      return { code: result.code, map: result.map };
    },
  };
}
