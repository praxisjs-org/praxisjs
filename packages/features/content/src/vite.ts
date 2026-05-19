import type { Plugin } from "vite";

// Matches @Collection('./path/*.md'), @Collection("./path/*.md"), @Collection(`./path/*.md`)
const COLLECTION_RE = /@Collection\(\s*(['"`])(.*?)\1\s*\)/g;

export function contentPlugin(): Plugin {
  return {
    name: "praxisjs:content",
    enforce: "pre",
    transform(code: string, id: string) {
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) return;
      if (!COLLECTION_RE.test(code)) return;
      COLLECTION_RE.lastIndex = 0; // reset after .test()

      const transformed = code.replace(
        COLLECTION_RE,
        (_match, _quote, glob: string) =>
          `@Collection(import.meta.glob(${JSON.stringify(glob)}, { query: '?raw', import: 'default' }))`,
      );

      return { code: transformed, map: null };
    },
  };
}
