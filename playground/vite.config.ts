import { defineConfig } from "vite";
import { praxisjs } from "@praxisjs/vite-plugin";
import { analyzer } from "vite-bundle-analyzer";

export default defineConfig({
  plugins: [praxisjs({ hmr: true }), analyzer()],
  esbuild: {
    jsxImportSource: "@praxisjs/jsx",
    target: "es2022",
  },
});
