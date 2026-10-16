import { HELPERS_ID, helpersModule } from "../decorators";

const HELPERS_IMPORT = new RegExp(`import \\{[^}]*\\} from "${HELPERS_ID}";`);

/**
 * Puts the shared helpers in place of their import, on the same line, so lowered code runs without
 * a bundler and keeps its lines.
 */
export function inlineHelpers(code: string): string {
  const helpers = helpersModule().replace(/^export \{[^}]*\};$/m, "").replace(/^export /gm, "").replaceAll("\n", " ");
  return code.replace(HELPERS_IMPORT, () => helpers);
}
