import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

import praxisjs from "@praxisjs/vite-plugin";

import type { Indexer } from "storybook/internal/types";

// Regex to strip the `accessor` keyword from class field declarations.
// Storybook's internal babelParse uses `decorators-legacy` but omits
// `decoratorAutoAccessors`, causing a parse error on `accessor fieldName`.
// Removing the keyword is safe for story indexing — loadCsf only needs to
// locate exports, not understand class internals.
const ACCESSOR_KEYWORD_RE = /\baccessor\s+(?=[a-zA-Z_$#])/g;

const praxisCsfIndexer: Indexer = {
  test: /(stories|story)\.(m?js|ts)x?$/,
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
    transform(code: string, id: string) {
      if (!(/\.stories\.(tsx?|jsx?)($|\?)/.exec(id))) return null;
      const filePath = id.split("?")[0];
      let originalSource: string;
      try {
        originalSource = readFileSync(filePath, "utf-8");
      } catch {
        return null;
      }
      const source = JSON.stringify(originalSource);
      const exportMatch = /export default (\w+);/.exec(code);
      if (!exportMatch) return null;
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
  return [...entries, new URL("../manager.jsx", import.meta.url).pathname];
}
