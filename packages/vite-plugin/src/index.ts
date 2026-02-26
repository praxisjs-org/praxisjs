import type { Plugin, ViteDevServer } from "vite";

export interface VerboseVitePluginOptions {
  hmr?: boolean;
  autoImport?: boolean;
}

export function verbose(options: VerboseVitePluginOptions = {}): Plugin[] {
  const { hmr = true, autoImport = true } = options;

  return [
    {
      name: "verbose:core",
      enforce: "pre",
      config() {
        return {
          esbuild: {
            target: "es2022",
          },
        };
      },
      transform(code, id) {
        if (!autoImport) return;
        if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return;
        if (code.includes("@verbose/jsx/jsx-runtime")) return;
        return null;
      },
    },
    ...(hmr
      ? [
          {
            name: "verbose:hmr",
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
                event: "verbose:component-update",
                data: { file },
              });
            },
          },
        ]
      : []),
  ];
}

export default verbose;
