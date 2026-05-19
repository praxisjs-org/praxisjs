import type { ContentSchema } from "./types";

export function applySchema<S extends ContentSchema>(
  SchemaClass: new () => S,
  data: Record<string, unknown>,
  slug: string,
): S {
  const defaults = new SchemaClass();
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
