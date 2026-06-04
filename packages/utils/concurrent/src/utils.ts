/**
 * Returns true if the function declares `signal` as its first parameter name.
 * Used to decide whether to inject an AbortSignal at call time.
 *
 * Works on unminified source (class methods, arrow functions, async functions).
 * Bound functions always return false — check the original method before binding.
 */
export function acceptsSignal(fn: (...args: unknown[]) => unknown): boolean {
  try {
    const src = fn.toString();
    // Match the first character of the parameter list, e.g.:
    //   async loadUser(signal, id)  →  "signal"
    //   (signal: AbortSignal) =>    →  "signal:"  (TS annotation stripped below)
    //   (id: number) =>             →  "id:"
    //   () =>                       →  ""
    const m = /\(\s*([^),\s]*)/.exec(src);
    const rawFirst = m?.[1] ?? "";
    const firstName = rawFirst.split(/[:=]/)[0].trim();
    return firstName === "signal";
  } catch {
    return false;
  }
}
