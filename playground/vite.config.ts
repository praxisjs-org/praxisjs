import { defineConfig } from "vite";
import { praxisjs, praxisjsCSS } from "@praxisjs/vite-plugin";
import { contentPlugin } from "@praxisjs/content/vite";

export default defineConfig({
  plugins: [praxisjs({ hmr: true }), praxisjsCSS(), contentPlugin()],
  oxc: {
    jsx: {
      importSource: "@praxisjs/jsx",
    },
    target: "es2022",
  },
});
