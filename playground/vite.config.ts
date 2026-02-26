import { defineConfig } from "vite";
import { verbose } from "@verbose/vite-plugin";

export default defineConfig({
  plugins: [verbose({ hmr: true })],
  esbuild: {
    jsxImportSource: "@verbose/jsx",
    target: "es2022",
  },
});
