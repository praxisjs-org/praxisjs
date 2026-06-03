import { defineConfig } from "vite";
import { praxisjs, praxisjsCSS } from "@praxisjs/vite-plugin";
import { contentPlugin } from "@praxisjs/content/vite";

export default defineConfig({
  plugins: [praxisjs({ hmr: true }), praxisjsCSS(), contentPlugin()],
  esbuild: {
    jsxImportSource: "@praxisjs/jsx",
    target: "es2022",
  },
});
