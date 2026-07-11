import { defineConfig } from "vite";
import { praxisjs } from "@praxisjs/vite-plugin";

export default defineConfig({
  plugins: [praxisjs()],
  oxc: {
    jsx: {
      importSource: "@praxisjs/jsx",
    },
    target: "es2022",
  },
});
