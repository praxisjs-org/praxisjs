import { readFileSync } from "node:fs";

import praxisjs from "@praxisjs/vite-plugin";

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
