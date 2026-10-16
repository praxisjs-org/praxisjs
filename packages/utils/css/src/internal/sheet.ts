import { hashCSS } from "./hash.js";
import { isCSSBuilder } from "../builder/css-builder.js";

const PARAM_META = new WeakMap<object, Set<string>>();

export function addParamName(ctor: object, name: string): void {
  let names = PARAM_META.get(ctor);
  if (!names) { names = new Set(); PARAM_META.set(ctor, names); }
  names.add(name);
}

export function getParamNames(ctor: object): ReadonlySet<string> | undefined {
  return PARAM_META.get(ctor);
}

export interface CompiledSheet {
  /** `$field` → scoped class name. */
  classMap: Readonly<Record<string, string>>;
  /** One `.class { ... }` block per `$` field, or `""` when there is none. */
  css: string;
  /** Content hash of `css`, the key of its `<style>` element. */
  key: string;
  /** `@Param()` field names, in declaration order. */
  params: readonly string[];
  /** Default value of each entry in `params`. */
  defaults: ReadonlyArray<string | number>;
}

const cache = new WeakMap<object, CompiledSheet>();

/**
 * Builds the scoped class names and CSS of a `Stylesheet` subclass, once per class: constructing
 * the template instance fires its `@Param()` initializers, which register the param names.
 */
export function compileSheet(SheetClass: new () => unknown): CompiledSheet {
  const cached = cache.get(SheetClass);
  if (cached) return cached;

  const template = new SheetClass() as Record<string, unknown>;
  const paramNames = getParamNames(SheetClass);

  const classMap: Record<string, string> = {};
  const params: string[] = [];
  const defaults: Array<string | number> = [];
  let css = "";

  for (const key of Object.keys(template)) {
    const value = template[key];
    if (key.startsWith("$")) {
      const rule = typeof value === "string" ? value : isCSSBuilder(value) ? String(value) : null;
      if (rule === null) continue;
      const className = `prx-${key.slice(1).replace(/[^\w-]/g, "-")}-${hashCSS(rule)}`;
      classMap[key] = className;
      const block = `.${className} { ${rule.trim()} }`;
      css = css === "" ? block : `${css}\n${block}`;
    } else if (paramNames?.has(key) && (typeof value === "string" || typeof value === "number")) {
      params.push(key);
      defaults.push(value);
    }
  }

  const compiled: CompiledSheet = {
    classMap: Object.freeze(classMap),
    css,
    key: css ? hashCSS(css) : "",
    params,
    defaults,
  };
  cache.set(SheetClass, compiled);
  return compiled;
}
