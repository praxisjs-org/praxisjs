import { fileURLToPath } from "node:url";

/** File path of `relative` next to `base`; a URL's `pathname` would keep %20 and a leading "/C:". */
export function packagePath(relative: string, base: string): string {
  return fileURLToPath(new URL(relative, base));
}
