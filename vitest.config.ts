import { resolve } from "path";

import { defineConfig } from "vitest/config";

import { decoratorLoweringPlugin } from "./packages/dx/vite-plugin/src/decorators";

// oxc doesn't lower TC39 (non-legacy) decorators yet — see the same note in
// packages/dx/vite-plugin/src/decorators.ts — so test files that declare
// decorated classes need this to make them runnable under Node.
// https://github.com/oxc-project/oxc/issues/9170
export default defineConfig({
  plugins: [decoratorLoweringPlugin()],
  resolve: {
    alias: {
      "@praxisjs/shared/internal": resolve(
        __dirname,
        "packages/foundation/shared/src/internal.ts",
      ),
      "@praxisjs/shared": resolve(
        __dirname,
        "packages/foundation/shared/src/index.ts",
      ),
      "@praxisjs/core/internal": resolve(
        __dirname,
        "packages/foundation/core/src/internal.ts",
      ),
      "@praxisjs/core": resolve(
        __dirname,
        "packages/foundation/core/src/index.ts",
      ),
      "@praxisjs/runtime": resolve(
        __dirname,
        "packages/foundation/runtime/src/index.ts",
      ),
      "@praxisjs/decorators": resolve(
        __dirname,
        "packages/foundation/decorators/src/index.ts",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/src/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/**/src/**/*.ts"],
      exclude: ["packages/**/src/__tests__/**", "packages/cli/create-praxisjs/templates/**"],
    },
  },
});
