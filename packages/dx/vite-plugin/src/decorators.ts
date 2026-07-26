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
    transform(code, id) {
      if (!JS_LIKE_FILE.test(id) || !code.includes("@")) return null;
      const fileName = cleanFileName(id);
      if (!hasRealDecorator(code, fileName)) return null;

      const { outputText, sourceMapText, diagnostics } = ts.transpileModule(code, {
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

      const errors = diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error) ?? [];
      if (errors.length > 0) {
        throw new Error(`[praxisjs:decorators] ${fileName}:\n${formatDiagnostics(errors)}`);
      }

      return {
        code: outputText,
        map: sourceMapText ? (JSON.parse(sourceMapText) as RawSourceMap) : null,
      };
    },
  };
}
