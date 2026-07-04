import { defineConfig } from "vite";
import { praxisjs } from "@praxisjs/vite-plugin";

export default defineConfig({
  plugins: [praxisjs()],
  esbuild: {
    jsxImportSource: "@praxisjs/jsx",
    target: "es2022",
  },
});
