import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyTauriPatches,
  dlxCommand,
  greetComponent,
  greetComponentPath,
  patchApp,
  patchGitignore,
  patchLibRs,
  patchPackageJson,
  patchReadme,
  patchStyles,
  patchTauriConf,
  patchViteConfig,
  pinTauriV2,
  productName,
  runScriptCommand,
  tauriIdentifier,
  tauriInitArgs,
} from "../tauri/patches";

const repoTemplates = path.resolve(import.meta.dirname, "../../../../../templates");
const fixtures = path.resolve(import.meta.dirname, "fixtures/tauri-init");
const TEMPLATE_NAMES = ["minimal", "router", "full", "blog"];

function readOrUndefined(file: string): string | undefined {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return undefined;
  }
}

/** A scaffolded project right after `tauri init`: the workspace template plus the generated src-tauri files. */
function scaffolded(template: string, overrides: Record<string, string | undefined> = {}) {
  return (file: string): string | undefined => {
    if (file in overrides) return overrides[file];
    if (file === "src-tauri/tauri.conf.json") return readOrUndefined(path.join(fixtures, "tauri.conf.json"));
    if (file === "src-tauri/src/lib.rs") return readOrUndefined(path.join(fixtures, "lib.rs"));
    return readOrUndefined(path.join(repoTemplates, template, file));
  };
}

const versions = { api: "^2.12.4", cli: "^2.12.3" };

describe("pinTauriV2", () => {
  it("pins a 2.x latest exactly for the CLI download and with a caret for package.json", () => {
    expect(pinTauriV2("2.12.3")).toEqual({ range: "^2.12.3", spec: "2.12.3" });
  });

  it("falls back to the v2 line when latest is another major or unknown", () => {
    expect(pinTauriV2("3.0.0")).toEqual({ range: "^2.0.0", spec: "2" });
    expect(pinTauriV2("")).toEqual({ range: "^2.0.0", spec: "2" });
  });
});

describe("runScriptCommand", () => {
  it("omits `run` only for yarn", () => {
    expect(runScriptCommand("yarn", "dev")).toBe("yarn dev");
    expect(runScriptCommand("npm", "dev")).toBe("npm run dev");
    expect(runScriptCommand("pnpm", "build")).toBe("pnpm run build");
    expect(runScriptCommand("bun", "dev")).toBe("bun run dev");
  });
});

describe("dlxCommand", () => {
  const args = ["init", "--ci"];

  it("uses each package manager's runner", () => {
    expect(dlxCommand("pnpm", "", "@tauri-apps/cli@2", args)).toEqual({
      command: "pnpm",
      args: ["dlx", "@tauri-apps/cli@2", "init", "--ci"],
    });
    expect(dlxCommand("bun", "", "x", args)).toEqual({ command: "bunx", args: ["x", "init", "--ci"] });
    expect(dlxCommand("yarn", "yarn/4.5.0 npm/? node/v22", "x", args)).toEqual({
      command: "yarn",
      args: ["dlx", "x", "init", "--ci"],
    });
    expect(dlxCommand("npm", "npm/10.0.0", "x", args)).toEqual({
      command: "npx",
      args: ["--yes", "x", "init", "--ci"],
    });
  });

  it("falls back to npx on Yarn 1, which has no dlx", () => {
    expect(dlxCommand("yarn", "yarn/1.22.22 npm/? node/v22", "x", []).command).toBe("npx");
  });
});

describe("tauriInitArgs", () => {
  it("runs init non-interactively against Vite's output and dev server, with no argument a shell would split", () => {
    const args = tauriInitArgs();
    expect(args).toEqual(["init", "--ci", "--frontend-dist", "../dist", "--dev-url", "http://localhost:5173"]);
    expect(args.every((arg) => !/[\s^&|<>"]/.test(arg))).toBe(true);
  });
});

describe("productName / tauriIdentifier", () => {
  it("drops the npm scope and characters Tauri rejects", () => {
    expect(productName("@acme/My App")).toBe("my-app");
    expect(productName("my-app")).toBe("my-app");
    expect(productName("~~~")).toBe("praxisjs-app");
  });

  it("builds a reverse-domain identifier whose segments start with a letter", () => {
    expect(tauriIdentifier("my-app")).toBe("com.example.my-app");
    expect(tauriIdentifier("2048")).toBe("com.example.app-2048");
  });
});

describe("greetComponentPath", () => {
  it("keeps minimal flat and puts the others in src/components", () => {
    expect(greetComponentPath("minimal")).toBe("src/greet.tsx");
    expect(greetComponentPath("router")).toBe("src/components/greet.tsx");
  });
});

describe("patchPackageJson", () => {
  it("adds the scripts and dependencies, keeping dependency keys sorted", () => {
    const source = JSON.stringify({
      name: "app",
      scripts: { dev: "vite" },
      dependencies: { "@praxisjs/core": "^1.0.0", zod: "^3.0.0" },
      devDependencies: { vite: "^8.0.0" },
    });
    const pkg = JSON.parse(patchPackageJson(source, versions)) as Record<string, Record<string, string>>;
    expect(pkg.scripts).toEqual({ dev: "vite", tauri: "tauri", "tauri:dev": "tauri dev", "tauri:build": "tauri build" });
    expect(Object.keys(pkg.dependencies)).toEqual(["@praxisjs/core", "@tauri-apps/api", "zod"]);
    expect(pkg.dependencies["@tauri-apps/api"]).toBe("^2.12.4");
    expect(pkg.devDependencies).toEqual({ "@tauri-apps/cli": "^2.12.3", vite: "^8.0.0" });
  });

  it("keeps existing tauri scripts and creates missing sections", () => {
    const out = patchPackageJson(JSON.stringify({ scripts: { tauri: "custom" } }), versions);
    expect(out.endsWith("}\n")).toBe(true);
    const pkg = JSON.parse(out) as Record<string, Record<string, string>>;
    expect(pkg.scripts.tauri).toBe("custom");
    expect(pkg.dependencies).toEqual({ "@tauri-apps/api": "^2.12.4" });

    const bare = JSON.parse(patchPackageJson("{}", versions)) as Record<string, Record<string, string>>;
    expect(bare.scripts["tauri:dev"]).toBe("tauri dev");
  });
});

describe("patchTauriConf", () => {
  const generated = fs.readFileSync(path.join(fixtures, "tauri.conf.json"), "utf-8");

  it("points the build at Vite with the project's package manager and names the app", () => {
    const conf = JSON.parse(patchTauriConf(generated, { name: "@acme/desk", packageManager: "pnpm" })) as {
      productName: string;
      version: string;
      identifier: string;
      build: Record<string, string>;
      app: { windows: Array<{ title: string; width: number }> };
      bundle: { active: boolean };
    };
    expect(conf.productName).toBe("desk");
    expect(conf.version).toBe("../package.json");
    expect(conf.identifier).toBe("com.example.desk");
    expect(conf.build).toEqual({
      frontendDist: "../dist",
      devUrl: "http://localhost:5173",
      beforeDevCommand: "pnpm run dev",
      beforeBuildCommand: "pnpm run build",
    });
    expect(conf.app.windows[0].title).toBe("desk");
    expect(conf.app.windows[0].width).toBe(800);
    expect(conf.bundle.active).toBe(true);
  });

  it("tolerates a config without build or windows", () => {
    const conf = JSON.parse(patchTauriConf("{}", { name: "x", packageManager: "yarn" })) as {
      build: Record<string, string>;
      app?: unknown;
    };
    expect(conf.build.beforeDevCommand).toBe("yarn dev");
    expect(conf.app).toBeUndefined();
    expect(() => patchTauriConf('{"app":{"windows":[]}}', { name: "x", packageManager: "npm" })).not.toThrow();
  });

  it("throws on invalid JSON", () => {
    expect(() => patchTauriConf("{", { name: "x", packageManager: "npm" })).toThrow();
  });
});

describe("patchViteConfig", () => {
  it.each(TEMPLATE_NAMES)("patches the %s template's config, keeping its plugins", (template) => {
    const source = fs.readFileSync(path.join(repoTemplates, template, "vite.config.ts"), "utf-8");
    const out = patchViteConfig(source);
    expect(out).not.toBeNull();
    expect(out).toContain('import { defineConfig, loadEnv } from "vite";');
    expect(out).toContain("export default defineConfig(({ mode }) => {");
    expect(out).toContain("strictPort: true,");
    expect(out).toContain("port: 5173,");
    expect(out).toContain('hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,');
    expect(out).toContain("clearScreen: false,");
    expect(out).toContain('envPrefix: ["VITE_", "TAURI_ENV_"],');
    expect(out).toContain('watch: { ignored: ["**/src-tauri/**"] },');
    expect(out).toMatch(/\n {4}plugins: \[.*praxisjs\(\)\],\n/);
    expect(out?.trimEnd().endsWith("});")).toBe(true);
  });

  it("adds a missing trailing comma to the last property and keeps CRLF line endings", () => {
    const source = [
      'import { defineConfig } from "vite";',
      "",
      "export default defineConfig({",
      "  plugins: []",
      "",
      "});",
      "",
    ].join("\r\n");
    const out = patchViteConfig(source);
    expect(out).toContain("    plugins: [],\r\n");
    expect(out?.includes("\n") && !/[^\r]\n/.test(out)).toBe(true);
  });

  it("handles an empty config object", () => {
    const out = patchViteConfig('import { defineConfig } from "vite";\nexport default defineConfig({\n});\n');
    expect(out).toContain("  return {\n    // Keep Rust");
  });

  it("returns null when the config no longer has the template shape", () => {
    expect(patchViteConfig("export default {};\n")).toBeNull();
    expect(patchViteConfig('import { defineConfig } from "vite";\nexport default defineConfig(() => ({}));\n')).toBeNull();
    expect(patchViteConfig('import { defineConfig } from "vite";\nexport default defineConfig({\n')).toBeNull();
  });
});

describe("patchGitignore", () => {
  it("appends the Tauri entries once", () => {
    const once = patchGitignore("node_modules\ndist\n");
    expect(once).toBe("node_modules\ndist\n\n# Tauri\nsrc-tauri/target\nsrc-tauri/gen/schemas\n");
    expect(patchGitignore(once)).toBe(once);
  });

  it("adds only the missing entries, handles a missing final newline, CRLF and no file", () => {
    expect(patchGitignore("dist\r\nsrc-tauri/target")).toBe("dist\r\nsrc-tauri/target\r\n\r\n# Tauri\r\nsrc-tauri/gen/schemas\r\n");
    expect(patchGitignore(undefined)).toBe("\n# Tauri\nsrc-tauri/target\nsrc-tauri/gen/schemas\n");
  });
});

describe("patchReadme", () => {
  const options = { name: "desk", template: "router", packageManager: "pnpm" };

  it("creates a README with the Tauri section when there is none", () => {
    const out = patchReadme(undefined, options);
    expect(out.startsWith("# desk\n\n## Desktop app (Tauri v2)\n")).toBe(true);
    expect(out).toContain("`pnpm run tauri:dev`");
    expect(out).toContain("`pnpm run tauri <command>`");
    expect(out).toContain("`src/components/greet.tsx`");
    expect(out).toContain("`com.example.desk`");
    expect(patchReadme("  \n", options).startsWith("# desk\n")).toBe(true);
  });

  it("appends to an existing README once, with `--` for npm script arguments", () => {
    const out = patchReadme("# Mine\n\nText\n", { ...options, packageManager: "npm" });
    expect(out.startsWith("# Mine\n\nText\n\n## Desktop app (Tauri v2)")).toBe(true);
    expect(out).toContain("`npm run tauri -- <command>`");
    expect(patchReadme(out, options)).toBe(out);
  });
});

describe("patchLibRs", () => {
  const generated = fs.readFileSync(path.join(fixtures, "lib.rs"), "utf-8");

  it("adds the greet command and registers it before run()", () => {
    const out = patchLibRs(generated);
    expect(out).toContain("#[tauri::command]\nfn greet(name: &str) -> String {");
    expect(out).toContain(
      "    .invoke_handler(tauri::generate_handler![greet])\n    .run(tauri::generate_context!())",
    );
    expect(out?.indexOf("fn greet(")).toBeLessThan(out?.indexOf("#[cfg_attr(mobile") ?? 0);
  });

  it("returns null when the file was already patched or changed shape", () => {
    expect(patchLibRs(patchLibRs(generated) ?? "")).toBeNull();
    expect(patchLibRs("pub fn run() {}\n")).toBeNull();
    expect(patchLibRs("#[cfg_attr(mobile, tauri::mobile_entry_point)]\npub fn run() {}\n")).toBeNull();
    expect(
      patchLibRs("  .run(tauri::generate_context!())\n#[cfg_attr(mobile, tauri::mobile_entry_point)]\n"),
    ).toBeNull();
  });
});

describe("patchApp", () => {
  it.each(TEMPLATE_NAMES)("renders <Greet /> above the footer of the %s template", (template) => {
    const source = fs.readFileSync(path.join(repoTemplates, template, "src/app.tsx"), "utf-8");
    const out = patchApp(source, "./components/greet");
    expect(out).toMatch(/\n(\s*)<Greet \/>\n\1<p class="footer">/);
    expect(out).toContain('import { Greet } from "./components/greet";');
  });

  it("starts a relative import block after package imports, and joins an existing one", () => {
    const app = (imports: string) => `${imports}\n\nfoo(\n  <p class="footer">Built with PraxisJS</p>\n);\n`;
    expect(patchApp(app('import { a } from "pkg";'), "./greet")).toContain(
      'import { a } from "pkg";\n\nimport { Greet } from "./greet";\n',
    );
    expect(patchApp(app('import { a } from "./a";'), "./greet")).toContain(
      'import { a } from "./a";\nimport { Greet } from "./greet";\n',
    );
  });

  it("inserts after the end of a multi-line import", () => {
    const source = 'import {\n  a,\n  b,\n} from "pkg";\nconst x = 1;\n<p class="footer">Built with PraxisJS</p>\n';
    expect(patchApp(source, "./greet")).toContain('} from "pkg";\n\nimport { Greet } from "./greet";\nconst x');
  });

  it("stops at the end of the file when an import never closes", () => {
    const out = patchApp('<p class="footer">Built with PraxisJS</p>\nimport {', "./greet");
    expect(out?.endsWith('import {\n\nimport { Greet } from "./greet";')).toBe(true);
  });

  it("returns null without the footer or without imports", () => {
    expect(patchApp('import { a } from "pkg";\n<footer />\n', "./greet")).toBeNull();
    expect(patchApp('<p class="footer">Built with PraxisJS</p>\n', "./greet")).toBeNull();
  });
});

describe("greetComponent", () => {
  it("calls the greet command and explains how to open the desktop app in a browser", () => {
    const source = greetComponent("bun");
    expect(source).toContain('import { invoke, isTauri } from "@tauri-apps/api/core";');
    expect(source).toContain('invoke<string>("greet", { name: this.name.trim() || "PraxisJS" })');
    expect(source).toContain("Open the desktop app with bun run tauri:dev to call Rust.");
  });
});

describe("patchStyles", () => {
  it("appends the example styles once", () => {
    const out = patchStyles(".app {}\n\n");
    expect(out.startsWith(".app {}\n\n/* ====")).toBe(true);
    expect(patchStyles(out)).toBe(out);
    expect(patchStyles(undefined)).toContain(".greet {");
  });
});

describe("applyTauriPatches", () => {
  it.each(TEMPLATE_NAMES)("patches the %s template without warnings", (template) => {
    const { files, warnings } = applyTauriPatches(scaffolded(template), {
      name: "desk",
      template,
      packageManager: "pnpm",
      versions,
    });
    expect(warnings).toEqual([]);
    const component = greetComponentPath(template);
    expect(Object.keys(files).sort()).toEqual(
      [
        ".gitignore",
        "README.md",
        "package.json",
        component,
        "src-tauri/src/lib.rs",
        "src-tauri/tauri.conf.json",
        "src/app.tsx",
        "src/style.css",
        "vite.config.ts",
      ].sort(),
    );
    const importPath = template === "minimal" ? "./greet" : "./components/greet";
    expect(files["src/app.tsx"]).toContain(`import { Greet } from "${importPath}";`);
  });

  it("fails when tauri init left no config or the project has no package.json", () => {
    const options = { name: "desk", template: "minimal", packageManager: "npm", versions };
    expect(() => applyTauriPatches(scaffolded("minimal", { "src-tauri/tauri.conf.json": undefined }), options)).toThrow(
      'Missing "src-tauri/tauri.conf.json"',
    );
    expect(() => applyTauriPatches(scaffolded("minimal", { "package.json": undefined }), options)).toThrow(
      'Missing "package.json"',
    );
  });

  it("warns instead of failing when vite.config.ts or app.tsx changed shape, or are missing", () => {
    const options = { name: "desk", template: "router", packageManager: "npm", versions };
    const changed = applyTauriPatches(
      scaffolded("router", { "vite.config.ts": "export default {};\n", "src/app.tsx": "export {};\n" }),
      options,
    );
    expect(changed.files["vite.config.ts"]).toBeUndefined();
    expect(changed.files["src/app.tsx"]).toBeUndefined();
    expect(changed.files["src/components/greet.tsx"]).toBeDefined();
    expect(changed.warnings).toHaveLength(2);
    expect(changed.warnings[0]).toContain("vite.config.ts was not updated");
    expect(changed.warnings[1]).toContain('Render <Greet /> (from "./components/greet")');

    const missing = applyTauriPatches(scaffolded("router", { "vite.config.ts": undefined, "src/app.tsx": undefined }), options);
    expect(missing.warnings).toHaveLength(2);
  });

  it("skips the whole greet example when lib.rs cannot be patched", () => {
    const options = { name: "desk", template: "minimal", packageManager: "npm", versions };
    for (const libRs of ["fn main() {}\n", undefined]) {
      const { files, warnings } = applyTauriPatches(scaffolded("minimal", { "src-tauri/src/lib.rs": libRs }), options);
      expect(files["src/greet.tsx"]).toBeUndefined();
      expect(files["src/app.tsx"]).toBeUndefined();
      expect(files["src/style.css"]).toBeUndefined();
      expect(files["package.json"]).toBeDefined();
      expect(warnings).toEqual([expect.stringContaining("The greet example was skipped")]);
    }
  });
});
