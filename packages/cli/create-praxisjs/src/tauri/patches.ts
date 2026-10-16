export const DEV_PORT = 5173;
export const HMR_PORT = 5174;
export const DEV_URL = `http://localhost:${String(DEV_PORT)}`;
export const FRONTEND_DIST = "../dist";
export const TAURI_DOCS_URL = "https://v2.tauri.app";
export const PREREQUISITES_URL = `${TAURI_DOCS_URL}/start/prerequisites/`;

export interface TauriVersions {
  api: string;
  cli: string;
}

export interface TauriPatchOptions {
  name: string;
  template: string;
  packageManager: string;
  versions: TauriVersions;
}

export interface TauriPatchResult {
  files: Record<string, string>;
  warnings: string[];
}

export type ReadFile = (relativePath: string) => string | undefined;

/**
 * Keeps the project on Tauri v2 even once a later major is tagged `latest`:
 * `spec` is what the Tauri CLI is downloaded as, `range` what package.json gets.
 */
export function pinTauriV2(latest: string): { range: string; spec: string } {
  return latest.startsWith("2.")
    ? { range: `^${latest}`, spec: latest }
    : { range: "^2.0.0", spec: "2" };
}

export function runScriptCommand(packageManager: string, script: string): string {
  return packageManager === "yarn" ? `yarn ${script}` : `${packageManager} run ${script}`;
}

/** Runs a package binary without installing it, the way each package manager does it. */
export function dlxCommand(
  packageManager: string,
  userAgent: string,
  spec: string,
  args: string[],
): { command: string; args: string[] } {
  if (packageManager === "pnpm") return { command: "pnpm", args: ["dlx", spec, ...args] };
  if (packageManager === "bun") return { command: "bunx", args: [spec, ...args] };
  // Yarn 1 has no `dlx`.
  if (packageManager === "yarn" && !userAgent.startsWith("yarn/1.")) {
    return { command: "yarn", args: ["dlx", spec, ...args] };
  }
  return { command: "npx", args: ["--yes", spec, ...args] };
}

export function tauriInitArgs(): string[] {
  return ["init", "--ci", "--frontend-dist", FRONTEND_DIST, "--dev-url", DEV_URL];
}

/** Last path segment of a package name, stripped of anything Tauri does not allow in a product name. */
export function productName(name: string): string {
  const base = name.slice(name.lastIndexOf("/") + 1);
  const slug = base
    .toLowerCase()
    .replace(/[^a-z\d-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "praxisjs-app" : slug;
}

/** Android package names reject segments that start with a digit. */
export function tauriIdentifier(name: string): string {
  const slug = productName(name);
  return `com.example.${/^\d/.test(slug) ? `app-${slug}` : slug}`;
}

export function greetComponentPath(template: string): string {
  return template === "minimal" ? "src/greet.tsx" : "src/components/greet.tsx";
}

function eolOf(source: string): string {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function indentOf(line: string): string {
  return line.slice(0, line.length - line.trimStart().length);
}

function lastIndexWhere(lines: string[], test: (line: string) => boolean): number {
  for (let i = lines.length - 1; i >= 0; i--) if (test(lines[i])) return i;
  return -1;
}

function sortKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function stringRecord(value: unknown): Record<string, string> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, string>)
    : {};
}

const TAURI_SCRIPTS = {
  tauri: "tauri",
  "tauri:dev": "tauri dev",
  "tauri:build": "tauri build",
};

export function patchPackageJson(source: string, versions: TauriVersions): string {
  const pkg = JSON.parse(source) as Record<string, unknown>;
  const scripts = stringRecord(pkg.scripts);
  for (const [script, command] of Object.entries(TAURI_SCRIPTS)) {
    if (!(script in scripts)) scripts[script] = command;
  }
  pkg.scripts = scripts;
  pkg.dependencies = sortKeys({ ...stringRecord(pkg.dependencies), "@tauri-apps/api": versions.api });
  pkg.devDependencies = sortKeys({ ...stringRecord(pkg.devDependencies), "@tauri-apps/cli": versions.cli });
  return JSON.stringify(pkg, null, 2) + "\n";
}

export interface TauriConfOptions {
  name: string;
  packageManager: string;
}

export function patchTauriConf(source: string, { name, packageManager }: TauriConfOptions): string {
  const conf = JSON.parse(source) as Record<string, unknown>;
  const product = productName(name);
  conf.productName = product;
  // Tauri reads the version from this file, so package.json stays the single source of truth.
  conf.version = "../package.json";
  conf.identifier = tauriIdentifier(name);
  conf.build = {
    ...stringRecord(conf.build),
    frontendDist: FRONTEND_DIST,
    devUrl: DEV_URL,
    beforeDevCommand: runScriptCommand(packageManager, "dev"),
    beforeBuildCommand: runScriptCommand(packageManager, "build"),
  };
  const app = conf.app as { windows?: Array<Record<string, unknown>> } | undefined;
  const window = app?.windows?.[0];
  if (window) window.title = product;
  return JSON.stringify(conf, null, 2) + "\n";
}

const VITE_IMPORT = 'import { defineConfig } from "vite";';
const VITE_EXPORT = "export default defineConfig({";

/**
 * Turns the template's `defineConfig({...})` into the function form so the
 * TAURI_* variables can be read with `loadEnv`, which needs no Node types in
 * the scaffolded tsconfig. Returns null when the file no longer has the shape
 * the templates ship with.
 */
export function patchViteConfig(source: string): string | null {
  const eol = eolOf(source);
  const lines = source.split(/\r?\n/);
  const importIndex = lines.indexOf(VITE_IMPORT);
  const start = lines.indexOf(VITE_EXPORT);
  const end = lines.lastIndexOf("});");
  if (importIndex === -1 || start === -1 || end <= start) return null;

  const body = lines.slice(start + 1, end).map((line) => (line === "" ? line : `  ${line}`));
  const last = lastIndexWhere(body, (line) => line.trim() !== "");
  if (last !== -1 && !body[last].trimEnd().endsWith(",")) body[last] = `${body[last].trimEnd()},`;

  lines[importIndex] = 'import { defineConfig, loadEnv } from "vite";';
  return [
    ...lines.slice(0, start),
    "export default defineConfig(({ mode }) => {",
    "  // `tauri dev` and `tauri build` describe the target through TAURI_* environment variables.",
    '  const env = loadEnv(mode, ".", "TAURI_");',
    "  const host = env.TAURI_DEV_HOST;",
    "",
    "  return {",
    ...body,
    "    // Keep Rust compiler errors from `tauri dev` on screen.",
    "    clearScreen: false,",
    "    server: {",
    `      port: ${String(DEV_PORT)},`,
    "      strictPort: true,",
    "      // TAURI_DEV_HOST is set when the app runs on a physical iOS or Android device.",
    "      host: host || false,",
    `      hmr: host ? { protocol: "ws", host, port: ${String(HMR_PORT)} } : undefined,`,
    '      watch: { ignored: ["**/src-tauri/**"] },',
    "    },",
    '    envPrefix: ["VITE_", "TAURI_ENV_"],',
    "    build: {",
    "      // Tauri builds target its webviews: WebView2 on Windows, WebKit everywhere else.",
    "      target: env.TAURI_ENV_PLATFORM",
    '        ? env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13"',
    "        : undefined,",
    "      minify: !env.TAURI_ENV_DEBUG,",
    "      sourcemap: Boolean(env.TAURI_ENV_DEBUG),",
    "    },",
    "  };",
    "});",
    ...lines.slice(end + 1),
  ].join(eol);
}

const GITIGNORE_ENTRIES = ["src-tauri/target", "src-tauri/gen/schemas"];

export function patchGitignore(source: string | undefined): string {
  const content = source ?? "";
  const eol = eolOf(content);
  const present = new Set(content.split(/\r?\n/).map((line) => line.trim()));
  const missing = GITIGNORE_ENTRIES.filter((entry) => !present.has(entry));
  if (missing.length === 0) return content;
  const prefix = content === "" || content.endsWith("\n") ? content : content + eol;
  return prefix + ["", "# Tauri", ...missing, ""].join(eol);
}

const README_HEADING = "## Desktop app (Tauri v2)";

export function patchReadme(
  source: string | undefined,
  { name, template, packageManager }: Omit<TauriPatchOptions, "versions">,
): string {
  if (source?.includes(README_HEADING)) return source;
  const run = (script: string) => runScriptCommand(packageManager, script);
  const section = [
    README_HEADING,
    "",
    "`src-tauri/` wraps this app in a native window with [Tauri v2](https://v2.tauri.app).",
    `It needs Rust and your platform's system dependencies: see ${PREREQUISITES_URL}.`,
    "",
    `- \`${run("tauri:dev")}\` starts Vite and opens the desktop window, with hot reload.`,
    `- \`${run("tauri:build")}\` builds the web app and bundles installers into \`src-tauri/target/release/bundle/\`.`,
    `- \`${run("tauri")}${packageManager === "npm" ? " --" : ""} <command>\` runs any other Tauri CLI command (\`icon\`, \`android init\`, \`ios init\`, ...).`,
    "",
    `\`${greetComponentPath(template)}\` calls the \`greet\` command defined in \`src-tauri/src/lib.rs\`.`,
    `Before you ship, replace \`identifier\` in \`src-tauri/tauri.conf.json\` (\`${tauriIdentifier(name)}\`) with your own reverse domain.`,
    "",
  ].join("\n");
  if (source === undefined || source.trim() === "") return `# ${name}\n\n${section}`;
  return `${source.trimEnd()}\n\n${section}`;
}

const RUST_ENTRY = "#[cfg_attr(mobile, tauri::mobile_entry_point)]";
const RUST_RUN = ".run(tauri::generate_context!())";

/** Adds a `greet` command to the lib.rs that `tauri init` generates. Null when its shape changed. */
export function patchLibRs(source: string): string | null {
  const eol = eolOf(source);
  const lines = source.split(/\r?\n/);
  const entry = lines.indexOf(RUST_ENTRY);
  const run = lines.findIndex((line) => line.trim() === RUST_RUN);
  if (entry === -1 || run < entry || source.includes("fn greet(")) return null;

  lines.splice(run, 0, `${indentOf(lines[run])}.invoke_handler(tauri::generate_handler![greet])`);
  lines.splice(
    entry,
    0,
    "#[tauri::command]",
    "fn greet(name: &str) -> String {",
    '  format!("Hello, {name}! You have been greeted from Rust.")',
    "}",
    "",
  );
  return lines.join(eol);
}

const FOOTER = '<p class="footer">Built with PraxisJS</p>';

/** Renders `<Greet />` above the template footer. Null when the app no longer has that footer. */
export function patchApp(source: string, importPath: string): string | null {
  const eol = eolOf(source);
  const lines = source.split(/\r?\n/);
  const footer = lines.findIndex((line) => line.trim() === FOOTER);
  const lastImport = lastIndexWhere(lines, (line) => /^import\b/.test(line));
  if (footer === -1 || lastImport === -1) return null;

  let importEnd = lastImport;
  while (!/["'];?\s*$/.test(lines[importEnd]) && importEnd < lines.length - 1) importEnd++;

  // Relative imports sit in their own block after the package imports.
  const greetImport = `import { Greet } from "${importPath}";`;
  const afterRelative = /from\s+["']\./.test(lines[importEnd]);
  const inserts: Array<[number, string[]]> = [
    [footer, [`${indentOf(lines[footer])}<Greet />`]],
    [importEnd + 1, afterRelative ? [greetImport] : ["", greetImport]],
  ];
  // Splicing the later position first keeps the earlier index valid.
  for (const [index, added] of inserts.sort(([a], [b]) => b - a)) lines.splice(index, 0, ...added);
  return lines.join(eol);
}

export function greetComponent(packageManager: string): string {
  return `import { invoke, isTauri } from "@tauri-apps/api/core";
import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";

@Component()
export class Greet extends StatefulComponent {
  @State() name = "";
  @State() message = "";

  async greet() {
    if (!isTauri()) {
      this.message = "Open the desktop app with ${runScriptCommand(packageManager, "tauri:dev")} to call Rust.";
      return;
    }
    this.message = await invoke<string>("greet", { name: this.name.trim() || "PraxisJS" });
  }

  render() {
    return (
      <form
        class="greet"
        onSubmit={(e: SubmitEvent) => {
          e.preventDefault();
          void this.greet();
        }}
      >
        <div class="greet-row">
          <input
            class="greet-input"
            placeholder="Enter a name..."
            value={() => this.name}
            onInput={(e: Event) => {
              this.name = (e.target as HTMLInputElement).value;
            }}
          />
          <button class="button" type="submit">
            Greet
          </button>
        </div>
        <p class="greet-message">{() => this.message}</p>
      </form>
    );
  }
}
`;
}

const GREET_STYLES = `
/* ============================================================
 * Tauri greet example
 * ============================================================ */

.greet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin: 24px 0;
}

.greet-row {
  display: flex;
  gap: 8px;
}

.greet-input {
  padding: 10px 14px;
  font: inherit;
  font-size: 0.875rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.greet-message {
  min-height: 1.4em;
  font-size: 0.875rem;
  color: var(--color-text-2);
}
`;

export function patchStyles(source: string | undefined): string {
  const content = source ?? "";
  if (content.includes(".greet {")) return content;
  return content.trimEnd() + "\n" + GREET_STYLES;
}

/**
 * Computes every file the Tauri setup writes on top of a scaffolded project
 * whose `src-tauri/` was just generated by `tauri init`. Pure: it only reads
 * through `read` and returns the new contents, so it can run on fixtures.
 */
export function applyTauriPatches(read: ReadFile, options: TauriPatchOptions): TauriPatchResult {
  const { packageManager, template, versions } = options;
  const files: Record<string, string> = {};
  const warnings: string[] = [];

  const require = (file: string): string => {
    const content = read(file);
    if (content === undefined) throw new Error(`Missing "${file}" after \`tauri init\`.`);
    return content;
  };

  files["package.json"] = patchPackageJson(require("package.json"), versions);
  files["src-tauri/tauri.conf.json"] = patchTauriConf(require("src-tauri/tauri.conf.json"), options);
  files[".gitignore"] = patchGitignore(read(".gitignore"));
  files["README.md"] = patchReadme(read("README.md"), options);

  const viteConfig = read("vite.config.ts");
  const patchedVite = viteConfig === undefined ? null : patchViteConfig(viteConfig);
  if (patchedVite === null) {
    warnings.push(
      `vite.config.ts was not updated. Set server.port ${String(DEV_PORT)}, server.strictPort true and ` +
        `clearScreen false by hand: ${TAURI_DOCS_URL}/start/frontend/vite/`,
    );
  } else {
    files["vite.config.ts"] = patchedVite;
  }

  const libRs = read("src-tauri/src/lib.rs");
  const patchedLib = libRs === undefined ? null : patchLibRs(libRs);
  if (patchedLib === null) {
    warnings.push(
      "The greet example was skipped: src-tauri/src/lib.rs does not have the shape `tauri init` usually generates.",
    );
    return { files, warnings };
  }
  files["src-tauri/src/lib.rs"] = patchedLib;

  const componentPath = greetComponentPath(template);
  files[componentPath] = greetComponent(packageManager);
  files["src/style.css"] = patchStyles(read("src/style.css"));

  const importPath = `./${componentPath.slice("src/".length).replace(/\.tsx$/, "")}`;
  const app = read("src/app.tsx");
  const patchedApp = app === undefined ? null : patchApp(app, importPath);
  if (patchedApp === null) {
    warnings.push(`Render <Greet /> (from "${importPath}") in src/app.tsx to try the example command.`);
  } else {
    files["src/app.tsx"] = patchedApp;
  }

  return { files, warnings };
}
