export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | Record<string, unknown>;

export function cx(...args: ClassValue[]): string {
  let out = "";
  for (const arg of args) out = append(out, arg);
  return out;
}

// Builds the string directly instead of collecting parts in an array: cx() runs on every render of
// every styled component.
function append(out: string, arg: ClassValue): string {
  if (!arg && arg !== 0) return out;
  if (typeof arg === "string" || typeof arg === "number") {
    return out === "" ? String(arg) : `${out} ${String(arg)}`;
  }
  if (Array.isArray(arg)) {
    for (const item of arg) out = append(out, item);
    return out;
  }
  if (typeof arg === "object") {
    for (const key in arg) {
      if (Object.hasOwn(arg, key) && arg[key]) out = out === "" ? key : `${out} ${key}`;
    }
  }
  return out;
}
