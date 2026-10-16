// Defined by the Vite CSS plugin via `define: { __PRAXIS_CSS_STATIC__: true }`.
// When true, CSS is already bundled via virtual:praxisjs/styles — skip DOM injection.
declare const __PRAXIS_CSS_STATIC__: boolean | undefined;

export const STATIC_MODE: boolean =
  typeof __PRAXIS_CSS_STATIC__ !== "undefined" && __PRAXIS_CSS_STATIC__;
