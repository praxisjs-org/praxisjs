import ts from "typescript";

import type { Plugin } from "vite";

const JS_LIKE_FILE = /\.[cm]?[jt]sx?(?:$|\?)/;

function cleanFileName(id: string): string {
  return id.split("?")[0];
}

function scriptKindFor(fileName: string): ts.ScriptKind {
  if (fileName.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (fileName.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (fileName.endsWith(".ts") || fileName.endsWith(".mts") || fileName.endsWith(".cts")) {
    return ts.ScriptKind.TS;
  }
  return ts.ScriptKind.JS;
}

// The `code.includes("@")` pre-filter below also matches "@" in comments
// (JSDoc, eslint-disable directives), so this walks a real AST to confirm
// actual decorator syntax is present before reprocessing the file — some
// framework code (`@praxisjs/concurrent`'s `acceptsSignal`) relies on
// `fn.toString()` returning untouched source.
function hasRealDecorator(code: string, fileName: string): boolean {
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, false, scriptKindFor(fileName));
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.canHaveDecorators(node) && (ts.getDecorators(node)?.length ?? 0) > 0) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

interface RawSourceMap {
  version: number;
  file?: string;
  sourceRoot?: string;
  sources: string[];
  sourcesContent?: Array<string | null>;
  names: string[];
  mappings: string;
}

function formatDiagnostics(diagnostics: readonly ts.Diagnostic[]): string {
  return ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => "",
    getNewLine: () => "\n",
  });
}

// ── Claimed fields ───────────────────────────────────────────────────────────
//
// TypeScript lowers a decorated field `x = v` to a class field `x = __runInitializers(this,
// _x_initializers, v)` and runs the field's extra initializers (where decorators install their
// accessors) at the very next step: as the prefix of the next field's initializer, or in the
// constructor right after the fields. Defining `x` as a data property and then replacing it with
// an accessor turns every instance into a slow dictionary-mode object in V8. So the field is
// removed and, at that next step, `__pxField` defines it: through the innermost decorator's
// `claim` (see CLAIM in @praxisjs/decorators), which installs its property directly, or as a data
// property when that decorator has none. It then runs the remaining extra initializers. The order
// of every step is unchanged.
//
// The initializer `v` stays where it was, as the body of a symbol-keyed method that the class's
// first static block takes off the prototype before anything else runs: it keeps the field's
// scope (a constructor's parameters and locals would shadow names it reads), `this`, `super` and
// `new.target`, and the output keeps its lines for the source map.

const PX_FIELD_HELPER =
  "const __pxClaim = Symbol.for(\"praxisjs.field.claim\"), __pxValue = Symbol(); " +
  "function __pxTake(p, k) { const f = p[k]; delete p[k]; return f; } " +
  "function __pxField(o, k, inits, extras) { " +
  "let v = inits[__pxValue].call(o); " +
  "for (let i = 0; i < inits.length; i++) v = inits[i].call(o, v); " +
  "let i = 0; const claim = extras.length > 0 ? extras[0][__pxClaim] : undefined; " +
  "if (claim !== undefined) { claim.call(o, v); i = 1; } " +
  "else Object.defineProperty(o, k, { value: v, writable: true, enumerable: true, configurable: true }); " +
  "for (; i < extras.length; i++) extras[i].call(o); }";

interface FieldInfo {
  name: string;
  extras: string;
  /** The static block that decorates the field. */
  block: ts.ClassStaticBlockDeclaration;
}

function isRunInitializers(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "__runInitializers"
    && node.arguments.length >= 2 && node.arguments[0].kind === ts.SyntaxKind.ThisKeyword && ts.isIdentifier(node.arguments[1]);
}

// `{ kind: "field", name: "x", static: false, private: false, ... }` → { initializers: { name, extras, block } }
function decoratedFields(cls: ts.ClassLikeDeclaration): Map<string, FieldInfo> {
  const fields = new Map<string, FieldInfo>();
  const visit = (node: ts.Node, owner: ts.ClassStaticBlockDeclaration): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "__esDecorate" && node.arguments.length === 6) {
      const [, , , ctx, inits, extras] = node.arguments;
      if (ts.isObjectLiteralExpression(ctx) && ts.isIdentifier(inits) && ts.isIdentifier(extras)) {
        const prop = (key: string) => ctx.properties.find((p): p is ts.PropertyAssignment =>
          ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === key)?.initializer;
        const kind = prop("kind");
        const name = prop("name");
        if (kind !== undefined && ts.isStringLiteral(kind) && kind.text === "field" && name !== undefined && ts.isStringLiteral(name)
          && prop("static")?.kind === ts.SyntaxKind.FalseKeyword && prop("private")?.kind === ts.SyntaxKind.FalseKeyword) {
          fields.set(inits.text, { name: name.text, extras: extras.text, block: owner });
        }
      }
    }
    ts.forEachChild(node, (child) => { visit(child, owner); });
  };
  for (const member of cls.members) if (ts.isClassStaticBlockDeclaration(member)) visit(member, member);
  return fields;
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

const newlines = (code: string) => "\n".repeat(code.split("\n").length - 1);

/** Rewrites claimable decorated fields of `output` (TypeScript's lowering); null when none. */
export function claimFields(output: string, fileName: string): string | null {
  if (!output.includes("__esDecorate(")) return null;
  // The output keeps JSX (`jsx: "preserve"`), which the JSX kind also parses in plain JS.
  const source = ts.createSourceFile(fileName, output, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  const edits: Edit[] = [];
  // Method keys only need to differ within a class: each one is gone from the prototype once
  // the class is defined.
  let keys = 0;
  const text = (node: ts.Node) => output.slice(node.getStart(source), node.getEnd());
  const visitClass = (cls: ts.ClassLikeDeclaration): void => {
    const fields = decoratedFields(cls);
    if (fields.size === 0) return;
    // extras variables of the removed fields
    const removed = new Set<string>();
    let pending: string[] = [];
    const takes: string[] = [];
    // The code that runs the prefix `__runInitializers(this, extras)` of a member: the pending
    // __pxField calls when `extras` belongs to a removed field, else the prefix after them.
    const prefixCode = (call: ts.CallExpression): string[] => {
      const extras = (call.arguments[1] as ts.Identifier).text;
      const calls = pending;
      pending = [];
      return removed.has(extras) ? calls : [...calls, text(call)];
    };
    for (const member of cls.members) {
      if (!ts.isPropertyDeclaration(member) || member.initializer === undefined) continue;
      if (member.modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword)) continue;
      // `(prefix, ...value)`, `prefix` alone (a field with no initializer, after a decorated one) or
      // `value`. A comma list nests to the left, so its first item is the innermost left operand.
      const whole = member.initializer;
      const items: ts.Expression[] = [];
      const inner = ts.isParenthesizedExpression(whole) ? whole.expression : whole;
      const flatten = (e: ts.Expression): void => {
        if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.CommaToken) {
          flatten(e.left);
          items.push(e.right);
        } else {
          items.push(e);
        }
      };
      flatten(inner);
      let prefix: ts.CallExpression | null = null;
      if (isRunInitializers(items[0]) && items[0].arguments.length === 2 && (items.length > 1 || inner === whole)) {
        prefix = items[0];
        items.shift();
      }
      const value = items.length === 1 ? items[0] : null;
      // A computed key may carry the evaluation of decorators (TypeScript only puts them in keys
      // that are not literals, and those fields have no literal name to claim them by).
      const literalKey = !ts.isComputedPropertyName(member.name) || ts.isLiteralExpression(member.name.expression);
      const info = literalKey && value !== null && isRunInitializers(value) && value.arguments.length === 3
        ? fields.get((value.arguments[1] as ts.Identifier).text)
        : undefined;
      if (info !== undefined) {
        const call = value as ts.CallExpression;
        const inits = (call.arguments[1] as ts.Identifier).text;
        const initial = call.arguments[2];
        const key = `__pxK${String(takes.length)}`;
        pending = [...(prefix === null ? pending : prefixCode(prefix)), `__pxField(this, ${JSON.stringify(info.name)}, ${inits}, ${info.extras})`];
        removed.add(info.extras);
        takes.push(`${inits}[__pxValue] = __pxTake(this.prototype, ${key});`);
        const head = output.slice(member.getStart(source), initial.getStart(source));
        const tail = output.slice(initial.getEnd(), member.getEnd());
        edits.push(
          { start: member.getStart(source), end: initial.getStart(source), text: `[${key}]() {${newlines(head)} return ` },
          { start: initial.getEnd(), end: member.getEnd(), text: `;${newlines(tail)} }` },
        );
        continue;
      }
      // A removed field's call waits in `pending` until the prefix that runs its extras.
      if (pending.length === 0) continue;
      if (prefix !== null) {
        edits.push({ start: prefix.getStart(source), end: prefix.getEnd(), text: `(${prefixCode(prefix).join(", ")})` });
      } else {
        edits.push(
          { start: whole.getStart(source), end: whole.getStart(source), text: `(${pending.splice(0).join(", ")}, ` },
          { start: whole.getEnd(), end: whole.getEnd(), text: ")" },
        );
      }
    }
    if (takes.length === 0) return;
    keys = Math.max(keys, takes.length);
    const open = [...fields.values()][0].block.body.getStart(source) + 1;
    edits.push({ start: open, end: open, text: ` ${takes.join(" ")}` });
    if (pending.length === 0) return;
    // The last removed field's step is the constructor's `__runInitializers(this, extras);`.
    const ctor = cls.members.find((m): m is ts.ConstructorDeclaration => ts.isConstructorDeclaration(m));
    const statement = ctor?.body?.statements.find((st) => ts.isExpressionStatement(st) && isRunInitializers(st.expression)
      && st.expression.arguments.length === 2 && removed.has((st.expression.arguments[1] as ts.Identifier).text));
    if (statement === undefined) {
      throw new Error(`[praxisjs:decorators] ${fileName}: could not find where the fields of a class finish initializing`);
    }
    edits.push({ start: statement.getStart(source), end: statement.getEnd(), text: `${pending.join("; ")};` });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) visitClass(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (edits.length === 0) return null;
  let result = output;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  const symbols = Array.from({ length: keys }, (_, i) => `__pxK${String(i)} = Symbol()`).join(", ");
  return `${PX_FIELD_HELPER} const ${symbols};\n${result}`;
}

/** Lines the claimed-fields helper adds in front of the output, for the source map: it is one line. */
export const PX_FIELD_HELPER_LINES = 1;

// ── Shared helpers ───────────────────────────────────────────────────────────
//
// TypeScript writes the helpers its decorator lowering calls (`__esDecorate`, `__runInitializers`,
// ...) at the top of every file it lowers, and claimed fields add theirs: the same kilobyte again in
// every decorated module of an app, and in every decorated file of a library built with tsc. One
// copy of each is served from a virtual module instead, and a definition is replaced with an import
// of it only when it is exactly the one TypeScript writes (read from TypeScript itself, so a version
// that writes a helper differently keeps its own).

/** The module the lowered files import their helpers from. */
export const HELPERS_ID = "virtual:praxisjs/decorators";
const RESOLVED_HELPERS_ID = `\0${HELPERS_ID}`;

const PX_HELPER_NAMES = ["__pxField", "__pxTake", "__pxValue"];

// Every kind of decorated member, so the lowering of this module calls every helper there is.
const HELPERS_PROBE = `const d = () => undefined;
@d export class A {
  @d static s = 1; @d f = 1; @d accessor a = 1; @d static accessor b = 1; @d m() {} @d get g() { return 1; } @d set g(v) {}
  @d #p = 1; @d accessor #q = 1; @d #m() {} @d get #g() { return 1; } @d set #g(v) {} @d static #s() {} @d [Symbol.iterator]() {}
}
export const B = @d class {};
export default @d class {}`;

function lowerDecorators(code: string, fileName: string): ts.TranspileOutput {
  return ts.transpileModule(code, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      useDefineForClassFields: true,
      jsx: ts.JsxEmit.Preserve,
      sourceMap: true,
    },
  });
}

interface TsHelper {
  name: string;
  start: number;
  end: number;
  /** The function the helper is defined as. */
  fn: string;
}

// `var __x = (this && this.__x) || function (...) { ... };` at the top level.
function tsHelpers(code: string, source: ts.SourceFile): TsHelper[] {
  const helpers: TsHelper[] = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) continue;
    const { name, initializer } = statement.declarationList.declarations[0];
    if (!ts.isIdentifier(name) || initializer === undefined || !ts.isBinaryExpression(initializer)) continue;
    if (initializer.operatorToken.kind !== ts.SyntaxKind.BarBarToken) continue;
    const { left, right } = initializer;
    if (code.slice(left.getStart(source), left.getEnd()) !== `(this && this.${name.text})`) continue;
    helpers.push({ name: name.text, start: statement.getStart(source), end: statement.getEnd(), fn: code.slice(right.getStart(source), right.getEnd()) });
  }
  return helpers;
}

let knownHelpers: Map<string, string> | null = null;

function typescriptHelpers(): Map<string, string> {
  if (knownHelpers === null) {
    const output = lowerDecorators(HELPERS_PROBE, "/praxisjs-helpers.ts").outputText;
    const source = ts.createSourceFile("/praxisjs-helpers.js", output, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    knownHelpers = new Map(tsHelpers(output, source).map((helper) => [helper.name, helper.fn]));
  }
  return knownHelpers;
}

// ── Compact decoration calls ─────────────────────────────────────────────────
//
// Each `__esDecorate(...)` call TypeScript writes carries its whole context object literal, access
// functions included: about 200 bytes per decorated member once minified, and `__esDecorate` itself
// handles every kind of member. For the common members (public fields and methods with a literal
// name, and the class itself) the call becomes one of the helpers below, which build the very same
// context objects (same keys in the same order, same access functions, a fresh copy per decorator)
// and apply the results the way `__esDecorate` does for that kind. Any other call is left as it is.

const PX_DECORATE_HELPER =
  "function __pxAccept(f) { if (f !== void 0 && typeof f !== \"function\") throw new TypeError(\"Function expected\"); return f; } " +
  "function __pxAddInit(context, state, extras) { context.addInitializer = function (f) { " +
  "if (state.done) throw new TypeError(\"Cannot add initializers after decoration has completed\"); " +
  "extras.push(__pxAccept(f || null)); }; return context; } " +
  "function __pxDecorateField(decorators, name, isStatic, metadata, initializers, extras) { " +
  "const state = { done: false }, has = (obj) => name in obj, get = (obj) => obj[name], set = (obj, value) => { obj[name] = value; }; " +
  "for (let i = decorators.length - 1; i >= 0; i--) { " +
  "const result = __pxAccept((0, decorators[i])(void 0, __pxAddInit({ kind: \"field\", name, static: isStatic, private: false, access: { has, get, set }, metadata }, state, extras))); " +
  "if (result) initializers.unshift(result); } " +
  "state.done = true; } " +
  "function __pxDecorateMethod(ctor, decorators, name, isStatic, metadata, extras) { " +
  "const state = { done: false }, has = (obj) => name in obj, get = (obj) => obj[name]; " +
  "const target = isStatic ? ctor : ctor.prototype, descriptor = Object.getOwnPropertyDescriptor(target, name); " +
  "for (let i = decorators.length - 1; i >= 0; i--) { " +
  "const result = __pxAccept((0, decorators[i])(descriptor.value, __pxAddInit({ kind: \"method\", name, static: isStatic, private: false, access: { has, get }, metadata }, state, extras))); " +
  "if (result) descriptor.value = result; } " +
  "Object.defineProperty(target, name, descriptor); state.done = true; } " +
  "function __pxDecorateClass(descriptor, decorators, metadata, extras) { " +
  "const state = { done: false }, name = descriptor.value.name; " +
  "for (let i = decorators.length - 1; i >= 0; i--) { " +
  "const result = __pxAccept((0, decorators[i])(descriptor.value, __pxAddInit({ kind: \"class\", name, metadata }, state, extras))); " +
  "if (result) descriptor.value = result; } " +
  "state.done = true; } " +
  "function __pxMeta(base) { return typeof Symbol === \"function\" && Symbol.metadata " +
  "? Object.create(arguments.length === 0 ? null : base[Symbol.metadata] ?? null) : void 0; } " +
  "function __pxSetMeta(target, metadata) { if (metadata) Object.defineProperty(target, Symbol.metadata, " +
  "{ enumerable: true, configurable: true, writable: true, value: metadata }); }";

const PX_DECORATE_NAMES = ["__pxDecorateField", "__pxDecorateMethod", "__pxDecorateClass", "__pxMeta", "__pxSetMeta"];

const METADATA_INIT = /^typeof Symbol === "function" && Symbol\.metadata \? Object\.create\((?:([\w$]+)\[Symbol\.metadata\] \?\? null|null)\) : void 0$/;
const METADATA_SET = /^if \(([\w$]+)\) Object\.defineProperty\(([\w$]+), Symbol\.metadata, \{ enumerable: true, configurable: true, writable: true, value: \1 \}\);$/;

function accessCode(name: string, withSet: boolean): string {
  const member = /^[A-Za-z_$][\w$]*$/.test(name) ? `.${name}` : `[${JSON.stringify(name)}]`;
  const set = withSet ? `, set: (obj, value) => { obj${member} = value; }` : "";
  return `{ has: obj => ${JSON.stringify(name)} in obj, get: obj => obj${member}${set} }`;
}

// The context literal's properties, in order, when each is a plain `key: value`.
function contextProps(node: ts.Expression): Array<[string, ts.Expression]> | null {
  if (!ts.isObjectLiteralExpression(node)) return null;
  const props: Array<[string, ts.Expression]> = [];
  for (const p of node.properties) {
    if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) return null;
    props.push([p.name.text, p.initializer]);
  }
  return props;
}

// The compact call for one `__esDecorate(ctor, descriptorIn, decorators, context, initializers, extras)`, or null.
function compactCall(call: ts.CallExpression, text: (node: ts.Node) => string): [helper: string, code: string] | null {
  const [ctor, descriptorIn, decorators, context, initializers, extras] = call.arguments;
  const props = contextProps(context);
  if (props === null || !ts.isIdentifier(decorators) || !ts.isIdentifier(extras)) return null;
  const keys = props.map(([key]) => key).join();
  const value = (key: string) => (props.find(([k]) => k === key) as [string, ts.Expression])[1];
  const isNull = (node: ts.Node) => node.kind === ts.SyntaxKind.NullKeyword;
  const metadata = keys.endsWith("metadata") ? value("metadata") : null;
  if (metadata === null || !ts.isIdentifier(metadata)) return null;
  const kind = value("kind");
  if (!ts.isStringLiteral(kind)) return null;

  if (kind.text === "class") {
    const name = value("name");
    if (keys !== "kind,name,metadata" || !isNull(ctor) || !isNull(initializers)) return null;
    // `_classDescriptor = { value: _classThis }` with `name: _classThis.name`.
    if (!ts.isBinaryExpression(descriptorIn) || descriptorIn.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return null;
    const assigned = contextProps(descriptorIn.right);
    if (assigned?.length !== 1 || assigned[0][0] !== "value" || !ts.isIdentifier(assigned[0][1])) return null;
    if (!ts.isPropertyAccessExpression(name) || name.name.text !== "name" || text(name.expression) !== text(assigned[0][1])) return null;
    return ["__pxDecorateClass", `__pxDecorateClass(${text(descriptorIn)}, ${decorators.text}, ${metadata.text}, ${extras.text})`];
  }

  if (keys !== "kind,name,static,private,access,metadata" || !isNull(descriptorIn)) return null;
  const name = value("name");
  const isStatic = value("static");
  if (!ts.isStringLiteral(name) || value("private").kind !== ts.SyntaxKind.FalseKeyword) return null;
  if (isStatic.kind !== ts.SyntaxKind.TrueKeyword && isStatic.kind !== ts.SyntaxKind.FalseKeyword) return null;
  const literal = JSON.stringify(name.text);
  if (text(name) !== literal) return null;
  if (kind.text === "field") {
    if (!isNull(ctor) || !ts.isIdentifier(initializers) || text(value("access")) !== accessCode(name.text, true)) return null;
    return ["__pxDecorateField", `__pxDecorateField(${decorators.text}, ${literal}, ${text(isStatic)}, ${metadata.text}, ${initializers.text}, ${extras.text})`];
  }
  if (kind.text === "method") {
    if (ctor.kind !== ts.SyntaxKind.ThisKeyword || !isNull(initializers) || text(value("access")) !== accessCode(name.text, false)) return null;
    return ["__pxDecorateMethod", `__pxDecorateMethod(this, ${decorators.text}, ${literal}, ${text(isStatic)}, ${metadata.text}, ${extras.text})`];
  }
  return null;
}

// Edits that turn the calls of `source` into compact ones, and the helpers they use.
function compactEdits(source: ts.SourceFile, code: string): { edits: Edit[]; names: Set<string> } {
  const edits: Edit[] = [];
  const names = new Set<string>();
  const text = (node: ts.Node) => code.slice(node.getStart(source), node.getEnd());
  const replace = (node: ts.Node, helper: string, replacement: string): void => {
    const start = node.getStart(source);
    names.add(helper);
    edits.push({ start, end: node.getEnd(), text: replacement + newlines(code.slice(start, node.getEnd())) });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "__esDecorate" && node.arguments.length === 6) {
      const compact = compactCall(node, text);
      if (compact !== null) {
        replace(node, compact[0], compact[1]);
        return;
      }
    } else if (ts.isConditionalExpression(node)) {
      const match = METADATA_INIT.exec(text(node));
      if (match !== null) {
        // The base class group is absent from the match of a class with no `extends`.
        const base = match[1] as string | undefined;
        replace(node, "__pxMeta", base === undefined ? "__pxMeta()" : `__pxMeta(${base})`);
        return;
      }
    } else if (ts.isIfStatement(node)) {
      const match = METADATA_SET.exec(text(node));
      if (match !== null) {
        replace(node, "__pxSetMeta", `__pxSetMeta(${match[2]}, ${match[1]});`);
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { edits, names };
}

/** The source of the virtual module: every helper TypeScript's decorator lowering calls, and PraxisJS's own. */
export function helpersModule(): string {
  const lines = [...typescriptHelpers()].map(([name, fn]) => `export var ${name} = ${fn};`);
  return `${lines.join("\n")}\n${PX_FIELD_HELPER}\n${PX_DECORATE_HELPER}\nexport { ${[...PX_HELPER_NAMES, ...PX_DECORATE_NAMES].join(", ")} };\n`;
}

/**
 * Replaces the helper definitions of `code` that the virtual module has with one import of them,
 * or returns null when there is none. Every line stays where it was, so a source map of `code`
 * still fits the result.
 */
export function shareHelpers(code: string, fileName: string, kind = ts.ScriptKind.JSX): string | null {
  const known = typescriptHelpers();
  const names: string[] = [];
  const edits: Edit[] = [];
  if (code.startsWith(PX_FIELD_HELPER)) {
    names.push(...PX_HELPER_NAMES);
    edits.push({ start: 0, end: PX_FIELD_HELPER.length, text: "" });
  }
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, kind);
  for (const helper of tsHelpers(code, source)) {
    if (known.get(helper.name) !== helper.fn) continue;
    names.push(helper.name);
    edits.push({ start: helper.start, end: helper.end, text: newlines(code.slice(helper.start, helper.end)) });
  }
  if (names.length === 0) return null;
  // The compact calls stand in for `__esDecorate`, so only a module that imports it gets them.
  if (names.includes("__esDecorate")) {
    const compact = compactEdits(source, code);
    edits.push(...compact.edits);
    names.push(...compact.names);
  }
  edits[0].text = `import { ${names.join(", ")} } from "${HELPERS_ID}";${edits[0].text}`;
  let result = code;
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  return result;
}

// oxc doesn't lower TC39 (non-legacy) decorators yet — `@Decorator()`
// syntax passes through unchanged and no JS runtime executes it directly:
// https://github.com/oxc-project/oxc/issues/9170
//
// TypeScript's compiler lowers them instead (the same lowering `tsc` uses
// to build every package here). At ES2022 a decorated field stays a real
// class field rather than being rewritten into a constructor assignment,
// so its initializer runs after `super()` automatically — no separate
// ordering fix-up is needed. JSX is left untouched (`jsx: "preserve"`) for
// oxc's own JSX pipeline to handle.
export function decoratorLoweringPlugin(): Plugin {
  return {
    name: "praxisjs:decorators",
    // Must run before Vite's built-in esbuild TS transform: esbuild's TC39
    // decorator support silently drops class fields that carry a decorator
    // but have no initializer (e.g. `@Styled(X) $s!: X;`), instead of lowering
    // them. Without `enforce: "pre"` this plugin runs in the "normal" tier,
    // after esbuild has already stripped the field — so `ts.transpileModule`
    // below never even sees it, and the field silently ends up `undefined` at
    // runtime with no build-time error.
    enforce: "pre",
    resolveId(id) {
      return id === HELPERS_ID ? RESOLVED_HELPERS_ID : null;
    },
    load(id) {
      return id === RESOLVED_HELPERS_ID ? helpersModule() : null;
    },
    transform(code, id) {
      if (!JS_LIKE_FILE.test(id)) return null;
      const fileName = cleanFileName(id);
      if (!code.includes("@") || !hasRealDecorator(code, fileName)) {
        // A file of a library built with tsc may hold the same helpers. Only an ES module can take
        // an import.
        if (!code.includes("(this && this.__")) return null;
        const kind = scriptKindFor(fileName);
        if (!ts.isExternalModule(ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, false, kind))) return null;
        const shared = shareHelpers(code, fileName, kind);
        return shared === null ? null : { code: shared, map: null };
      }

      const { outputText, sourceMapText, diagnostics } = lowerDecorators(code, fileName);

      const errors = diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) ?? [];
      if (errors.length > 0) {
        throw new Error(`[praxisjs:decorators] ${fileName}:\n${formatDiagnostics(errors)}`);
      }

      const claimed = claimFields(outputText, fileName);
      const map = sourceMapText ? (JSON.parse(sourceMapText) as RawSourceMap) : null;
      const output = claimed ?? outputText;
      return {
        code: shareHelpers(output, fileName) ?? output,
        map: claimed === null || map === null ? map : { ...map, mappings: ";".repeat(PX_FIELD_HELPER_LINES) + map.mappings },
      };
    },
  };
}
