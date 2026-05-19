import { defineConfig } from "vite";
import { praxisjs } from "@praxisjs/vite-plugin";
import { contentPlugin } from "@praxisjs/content/vite";

export default defineConfig({
  plugins: [praxisjs({ hmr: true }), contentPlugin()],
  esbuild: {
    jsxImportSource: "@praxisjs/jsx",
    target: "es2022",
  },
});
