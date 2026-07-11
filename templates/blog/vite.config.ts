import { defineConfig } from "vite";
import { praxisjs } from "@praxisjs/vite-plugin";
import { contentPlugin } from "@praxisjs/content/vite";

export default defineConfig({
  plugins: [praxisjs(), contentPlugin()],
  oxc: {
    jsx: {
      importSource: "@praxisjs/jsx",
    },
    target: "es2022",
  },
});
