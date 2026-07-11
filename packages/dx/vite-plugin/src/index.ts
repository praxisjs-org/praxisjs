import { praxisjsCSS } from "./css.js";
import { decoratorLoweringPlugin } from "./decorators.js";

import type { PluginOption, ViteDevServer } from "vite";

export { praxisjsCSS };
export { decoratorLoweringPlugin };

export interface PraxisJSVitePluginOptions {
  hmr?: boolean;
  autoImport?: boolean;
}

export function praxisjs(options: PraxisJSVitePluginOptions = {}): PluginOption[] {
  const { hmr = true, autoImport = true } = options;

  return [
    decoratorLoweringPlugin(),
    {
      name: "praxisjs:core",
      enforce: "pre",
      config() {
        return {
          oxc: {
            target: "es2022",
          },
        };
      },
      transform(code, id) {
        if (!autoImport) return;
        if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return;
        if (code.includes("@praxisjs/jsx/jsx-runtime")) return;
        return null;
      },
    },
    ...(hmr
      ? [
          {
            name: "praxisjs:hmr",
            enforce: "post" as const,
            handleHotUpdate({
              file,
              server,
            }: {
              file: string;
              server: ViteDevServer;
            }) {
              if (!file.endsWith(".tsx") && !file.endsWith(".ts")) return;

              server.ws.send({
                type: "custom",
                event: "praxisjs:component-update",
                data: { file },
              });
            },
          },
        ]
      : []),
  ];
}

export default praxisjs;
