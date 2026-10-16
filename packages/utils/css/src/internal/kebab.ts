const cache = new Map<string, string>();

/** `backgroundColor` → `background-color`. Memoized: the same few hundred property and token names repeat. */
export function toKebab(camel: string): string {
  let kebab = cache.get(camel);
  if (kebab === undefined) {
    kebab = camel.replace(/([A-Z])/g, "-$1").toLowerCase();
    cache.set(camel, kebab);
  }
  return kebab;
}

/** One `prop: value;` line per defined entry, each prefixed with `indent`. */
export function declarations(props: Readonly<Record<string, string | number | null | undefined>>, indent: string): string {
  let out = "";
  for (const key in props) {
    const value = props[key];
    if (value == null) continue;
    const line = `${indent}${toKebab(key)}: ${String(value)};`;
    out = out === "" ? line : `${out}\n${line}`;
  }
  return out;
}
