import path from "path";

import UnoCSS from "unocss/vite";
import { defineConfig, type PluginOption } from "vite";
import dts from "vite-plugin-dts";

// The panel is a PraxisJS app too: compile its JSX into templates and its keyed lists into For,
// straight from the sibling plugin's source so no build order between the two packages is needed.
import { keyedListsPlugin } from "../vite-plugin/src/keyed-lists";
import { templatesPlugin } from "../vite-plugin/src/templates";

export default defineConfig({
  plugins: [keyedListsPlugin(), templatesPlugin(), ...UnoCSS(), dts({ rollupTypes: true })] as PluginOption[],
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "@praxisjs/jsx",
    },
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: (id) => id.startsWith("@praxisjs/"),
      // One file per module, with "sideEffects": false in package.json: an app that imports only
      // @Trace() or @Debug() (kept in production code, where they do nothing) gets those modules,
      // not the whole panel.
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        // Inlined assets and @unocss/reset live outside src: flatten them into dist/assets, since npm
        // never packs a directory named node_modules.
        entryFileNames: ({ name }) => (name.includes("/assets/") || name.includes("node_modules/") ? `assets/${path.basename(name).replace(/\?.*/, "")}.js` : `${name}.js`),
      },
    },
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "src/ui/shared"),
      "@assets": path.resolve(__dirname, "assets"),
      "@core": path.resolve(__dirname, "src/core"),
      "@plugins": path.resolve(__dirname, "src/plugins"),
      "@decorators": path.resolve(__dirname, "src/decorators"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@icons": path.resolve(__dirname, "src/icons"),
    },
  },
});
