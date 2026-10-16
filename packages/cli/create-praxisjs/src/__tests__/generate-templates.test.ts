import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, it, expect } from "vitest";

// The generator is a plain build script at the repository root, loaded by path.
const script = path.resolve(import.meta.dirname, "../../../../../scripts/generate-templates.mjs");
const { generateTemplates } = (await import(/* @vite-ignore */ script)) as {
  generateTemplates: (from: string, to: string, catalog: Record<string, string>) => string[];
};

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "praxis-templates-"));
  dirs.push(dir);
  return dir;
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

describe("generate-templates", () => {
  it("leaves the workspace package's changelog, build output and dependencies out, and allows esbuild's install script", () => {
    const from = tempDir();
    const to = tempDir();
    write(path.join(from, "app/CHANGELOG.md"), "# app\n");
    write(path.join(from, "app/src/docs/CHANGELOG.md"), "user content\n");
    write(path.join(from, "app/src/main.tsx"), "export {};\n");
    write(path.join(from, "app/dist/index.js"), "");
    write(path.join(from, "app/node_modules/x/index.js"), "");
    write(path.join(from, "app/.gitignore"), "dist\n");
    write(path.join(from, "app/package.json"), JSON.stringify({
      name: "app",
      private: true,
      version: "1.2.3",
      devDependencies: { vite: "catalog:", "@praxisjs/core": "workspace:*" },
    }));

    expect(generateTemplates(from, to, { vite: "^8.0.0" })).toEqual(["app"]);

    const out = path.join(to, "app");
    expect(fs.readdirSync(out).sort()).toEqual(["_gitignore", "_package.json", "src"]);
    expect(fs.existsSync(path.join(out, "src/docs/CHANGELOG.md"))).toBe(true);
    expect(JSON.parse(fs.readFileSync(path.join(out, "_package.json"), "utf8"))).toEqual({
      name: "app",
      version: "0.1.0",
      devDependencies: { vite: "^8.0.0", "@praxisjs/core": "workspace:*" },
      pnpm: { onlyBuiltDependencies: ["esbuild"] },
    });
  });
});
