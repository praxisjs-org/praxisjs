import type { ContentSchema } from "./types";

// The defaults are only compared against, never handed out, so one instance per schema class serves
// every entry instead of constructing a second throwaway instance per entry.
const _defaults = new WeakMap<new () => ContentSchema, ContentSchema>();

function defaultsOf<S extends ContentSchema>(SchemaClass: new () => S): S {
  let defaults = _defaults.get(SchemaClass) as S | undefined;
  if (!defaults) {
    defaults = new SchemaClass();
    _defaults.set(SchemaClass, defaults);
  }
  return defaults;
}

export function applySchema<S extends ContentSchema>(
  SchemaClass: new () => S,
  data: Record<string, unknown>,
  slug: string,
): S {
  const defaults = defaultsOf(SchemaClass);
  const result = new SchemaClass();

  for (const key of Object.keys(defaults as object) as Array<keyof S>) {
    const raw = data[key as string];
    const dflt = defaults[key];
    const isArr = Array.isArray(dflt);

    if (raw === undefined) {
      // Non-zero / non-empty default signals that the field is semantically required.
      // Empty string, false, 0, and empty array are treated as optional defaults.
      const isEmpty =
        dflt === "" ||
        dflt === false ||
        dflt === 0 ||
        (Array.isArray(dflt) && dflt.length === 0);
      if (!isEmpty) {
        console.warn(`[content] "${slug}": missing field "${String(key)}"`);
      }
      // result[key] keeps the default value from new SchemaClass()
    } else if (isArr ? !Array.isArray(raw) : typeof raw !== typeof dflt) {
      console.warn(
        `[content] "${slug}": field "${String(key)}" has wrong type, using default`,
      );
    } else {
      result[key] = raw as S[keyof S];
    }
  }

  return result;
}
