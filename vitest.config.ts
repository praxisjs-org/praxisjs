import { resolve } from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
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
      exclude: ["packages/**/src/__tests__/**", "packages/create-praxisjs/templates/**"],
    },
  },
});
