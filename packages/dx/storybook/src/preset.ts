import { readFile } from "node:fs/promises";

import praxisjs from "@praxisjs/vite-plugin";

// Storybook loads the preset with Node itself, which needs the extension tsc leaves as written.
import { packagePath } from "./paths.js";

import type { Indexer, PreviewAnnotation } from "storybook/internal/types";

const STORY_FILE = /\.(stories|story)\.(m?js|ts)x?$/;

// Regex to strip the `accessor` keyword from class field declarations.
// Storybook's internal babelParse uses `decorators-legacy` but omits
// `decoratorAutoAccessors`, causing a parse error on `accessor fieldName`.
// Removing the keyword is safe for story indexing — loadCsf only needs to
// locate exports, not understand class internals.
const ACCESSOR_KEYWORD_RE = /\baccessor\s+(?=[a-zA-Z_$#])/g;

const praxisCsfIndexer: Indexer = {
  test: STORY_FILE,
  createIndex: async (fileName, options) => {
    const rawCode = await readFile(fileName, "utf-8");
    if (!rawCode.trim()) return [];
    const { loadCsf } = await import("storybook/internal/csf-tools");
    const code = rawCode.replace(ACCESSOR_KEYWORD_RE, "");
    return loadCsf(code, { ...options, fileName }).parse().indexInputs;
  },
};

export function experimental_indexers(existingIndexers: Indexer[] = []): Indexer[] {
  return [praxisCsfIndexer, ...existingIndexers];
}

function storySourcePlugin() {
  return {
    name: "praxisjs-story-source",
    enforce: "post" as const,
    async transform(code: string, id: string) {
      const filePath = id.split("?")[0];
      if (!STORY_FILE.test(filePath)) return null;
      const exportMatch = /export default (\w+);/.exec(code);
      if (!exportMatch) return null;
      let originalSource: string;
      try {
        originalSource = await readFile(filePath, "utf-8");
      } catch {
        return null;
      }
      const source = JSON.stringify(originalSource);
      const metaVar = exportMatch[1];
      const injection = `\n${metaVar}.parameters = {\n  ...${metaVar}.parameters,\n  storySource: { source: ${source} },\n};`;
      return {
        code: code.replace(`export default ${metaVar};`, `${injection}\nexport default ${metaVar};`),
        map: null,
      };
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function viteFinal(config: Record<string, any>): Record<string, any> {
  config.plugins = [
    ...((config.plugins as unknown[] | undefined) ?? []),
    praxisjs({ hmr: true }),
    storySourcePlugin(),
  ];
  return config;
}

export const core = {
  builder: "@storybook/builder-vite",
};

export function managerEntries(entries: string[] = []): string[] {
  return [...entries, packagePath("../manager.jsx", import.meta.url)];
}

/** Registers `renderToCanvas` and the default `render`, so `.storybook/preview.ts` needs no setup. */
export function previewAnnotations(entries: PreviewAnnotation[] = []): PreviewAnnotation[] {
  return [...entries, packagePath("./preview.js", import.meta.url)];
}
