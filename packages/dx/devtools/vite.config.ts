import path from "path";

import UnoCSS from "unocss/vite";
import { defineConfig, type PluginOption } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [...UnoCSS(), dts({ rollupTypes: true })] as PluginOption[],
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
