import { defineConfig } from "vite";
import { praxisjs, praxisjsCSS } from "@praxisjs/vite-plugin";
import { contentPlugin } from "@praxisjs/content/vite";
import { ssgPlugin } from "@praxisjs/ssg";

export default defineConfig({
  plugins: [
    // contentPlugin() must run before praxisjs(): both are enforce: "pre",
    // and Vite preserves relative order within that tier — praxisjs()'s
    // decoratorLoweringPlugin() strips `@Collection(...)` down to a plain
    // `Collection(...)` call before contentPlugin()'s regex transform ever
    // sees the `@`, so the glob string would reach @praxisjs/content
    // unexpanded (and getCollection() would iterate its characters as if it
    // were a list of files) if the order were reversed.
    contentPlugin(),
    praxisjs({ hmr: true }),
    praxisjsCSS(),
    ssgPlugin({ root: "./src/app.tsx" }),
  ],
  oxc: {
    jsx: {
      importSource: "@praxisjs/jsx",
    },
    target: "es2022",
  },
});
