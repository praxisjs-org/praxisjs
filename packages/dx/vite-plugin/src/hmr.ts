import ts from "typescript";

import type { Plugin } from "vite";

// Component hot replacement, development only. Every top-level class of a module is registered
// with the runtime under `<file>#<class>` (the runtime ignores classes that are not components),
// so an edited module that runs again replaces its components in place (see @praxisjs/runtime's
// hmr.ts). The module accepts its own update only when all it exports are classes: anything else
// it exports (a helper, a constant, a store) may be held by the modules that import it, so those
// updates keep Vite's default handling, which runs the importers again or reloads the page. A
// module whose new exports turn out not to be components at runtime also hands the update on.

const SCRIPT_FILE = /\.[cm]?[jt]sx?$/;

function scriptKindFor(fileName: string): ts.ScriptKind {
  if (fileName.endsWith("x")) return fileName.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
  return fileName.endsWith(".js") || fileName.endsWith(".mjs") || fileName.endsWith(".cjs") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some((m) => m.kind === kind) ?? false);
}

interface ModuleShape {
  classes: string[];
  /** Every value the module exports is one of its top-level classes. */
  onlyClasses: boolean;
}

function moduleShape(source: ts.SourceFile): ModuleShape {
  const classes: string[] = [];
  let exportsValue = false;
  let exportsOther = false;
  const exportedNames: string[] = [];
  for (const statement of source.statements) {
    if (ts.isClassDeclaration(statement) && !hasModifier(statement, ts.SyntaxKind.DeclareKeyword)) {
      const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
      if (statement.name !== undefined) classes.push(statement.name.text);
      if (exported) {
        exportsValue = true;
        // `export default class {}` has no binding to register.
        if (statement.name === undefined) exportsOther = true;
      }
    } else if (ts.isExportAssignment(statement)) {
      exportsValue = true;
      if (ts.isIdentifier(statement.expression)) exportedNames.push(statement.expression.text);
      else exportsOther = true;
    } else if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      exportsValue = true;
      const clause = statement.exportClause;
      if (statement.moduleSpecifier !== undefined || clause === undefined || !ts.isNamedExports(clause)) {
        exportsOther = true;
        continue;
      }
      for (const element of clause.elements) {
        if (!element.isTypeOnly) exportedNames.push((element.propertyName ?? element.name).text);
      }
    } else if (
      hasModifier(statement, ts.SyntaxKind.ExportKeyword) &&
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement) &&
      !hasModifier(statement, ts.SyntaxKind.DeclareKeyword)
    ) {
      exportsValue = true;
      exportsOther = true;
    }
  }
  const onlyClasses = exportsValue && !exportsOther && exportedNames.every((name) => classes.includes(name));
  return { classes, onlyClasses };
}

/** Appends the hot replacement code to a module; null when it declares no top-level class. */
export function transformHmr(code: string, id: string): string | null {
  const fileName = id.split("?")[0];
  if (!SCRIPT_FILE.test(fileName) || !code.includes("class")) return null;
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, false, scriptKindFor(fileName));
  const { classes, onlyClasses } = moduleShape(source);
  if (classes.length === 0) return null;
  // Appended, not prepended: imports are hoisted, and every original line keeps its place for the
  // source map.
  let footer = '\nimport { _$hmrRegister as __pxHotRegister, _$hmrAccepts as __pxHotAccepts } from "@praxisjs/runtime";\n';
  for (const name of classes) footer += `__pxHotRegister(${name}, ${JSON.stringify(`${fileName}#${name}`)});\n`;
  if (onlyClasses) {
    footer += "if (import.meta.hot) import.meta.hot.accept((mod) => { if (!__pxHotAccepts(mod)) import.meta.hot.invalidate(); });\n";
  }
  return code + footer;
}

export function hmrPlugin(): Plugin {
  let root = "/";
  return {
    name: "praxisjs:hmr",
    apply: "serve",
    enforce: "pre",
    configResolved(config) {
      root = config.root.endsWith("/") ? config.root : `${config.root}/`;
    },
    transform(code, id, options) {
      // The app's own modules only: dependencies (including workspace packages linked from outside
      // the project) are not edited while it runs, and may not resolve @praxisjs/runtime.
      if (options?.ssr === true || !id.startsWith(root) || id.includes("/node_modules/")) return null;
      const result = transformHmr(code, id);
      // Code only appended at the end: the existing source map still holds.
      return result === null ? null : { code: result, map: null };
    },
  };
}
