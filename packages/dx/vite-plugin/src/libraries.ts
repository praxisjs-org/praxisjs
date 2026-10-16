import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

import { HELPERS_ID, helpersModule, transformDecorators } from "./decorators.js";
import { transformKeyedLists } from "./keyed-lists.js";
import { MappedOutput } from "./mapped-output.js";
import { transformTemplates } from "./templates.js";

import type { Plugin, Rolldown } from "vite";

// A PraxisJS library built with tsc reaches an app as plain JS: none of the build-time work the
// app's own files get (claimed fields, compiled templates, keyed lists) happens to it. A library
// opts in with a `praxisjs` field in its package.json; an app can also opt a package in or out by
// name. Its compiled files then get their decorated fields claimed, and when it ships its sources
// and says where they are (`rootDir`, `outDir`, as in its tsconfig), every import of a compiled file
// loads its source instead, which the app compiles like its own.

export interface LibraryOptions {
  /** Where the package keeps the sources its build output comes from (tsc's `rootDir`), relative to its package.json. */
  rootDir?: string;
  /** Where its build output is (tsc's `outDir`). With `rootDir`, the package is compiled from its sources. */
  outDir?: string;
}

/**
 * Packages compiled like the app's own code, by name (`"@scope/*"` names a whole scope): `true` or
 * options opt a package in, `false` leaves it as published even when its package.json opts in.
 */
export type LibrariesOption = Record<string, boolean | LibraryOptions>;

/** What the app compiles in its own files, and so in the libraries' too. */
export interface LibraryTransforms {
  keyedLists: boolean;
  /** The ids the template compiler takes, or null when it is off. */
  templates: RegExp | null;
}

interface PackageInfo {
  dir: string;
  library: boolean;
  /** Absolute and ending in a separator, when the package is compiled from its sources. */
  source: { rootDir: string; outDir: string } | null;
  /** Its dependencies, peer and optional ones included. */
  deps: string[];
}

interface PackageJson {
  name?: unknown;
  praxisjs?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  peerDependencies?: unknown;
  optionalDependencies?: unknown;
}

// What tsc compiles to each output extension.
const SOURCE_EXTENSIONS = new Map([
  [".js", [".tsx", ".ts", ".jsx", ".js"]],
  [".jsx", [".tsx", ".jsx"]],
  [".mjs", [".mts", ".mjs"]],
]);
const JSX_FILE = /\.[jt]sx$/;
const JSX_PRAGMA = "/* @jsxImportSource @praxisjs/jsx */ ";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const keys = (value: unknown): string[] => (isRecord(value) ? Object.keys(value) : []);

const cleanId = (id: string) => id.split("?")[0];

function readJson(file: string): PackageJson | null {
  try {
    const json: unknown = JSON.parse(readFileSync(file, "utf8"));
    return isRecord(json) ? json : null;
  } catch {
    return null;
  }
}

/** `@scope/name/sub` → `@scope/name`, `name/sub` → `name`. */
function packageName(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

const inside = (dir: string, path: string) => path.startsWith(dir.endsWith(sep) ? dir : dir + sep);

export class Libraries {
  /** The package each directory belongs to, or null outside of any. */
  private readonly packages = new Map<string, PackageInfo | null>();
  /** Names of the libraries compiled from their sources, found by `discover`. */
  private readonly sourceNames = new Set<string>();

  constructor(readonly option: LibrariesOption = {}) {}

  clear(): void {
    this.packages.clear();
  }

  private setting(name: string): boolean | LibraryOptions | undefined {
    if (name in this.option) return this.option[name];
    const scope = `${name.split("/")[0]}/*`;
    return name.startsWith("@") && scope in this.option ? this.option[scope] : undefined;
  }

  /** The package whose package.json is in `dir`, or null when it has none with a name. */
  private packageIn(dir: string): PackageInfo | null {
    const json = readJson(join(dir, "package.json"));
    if (json === null || typeof json.name !== "string") return null;
    const field = isRecord(json.praxisjs) ? json.praxisjs : {};
    const setting = this.setting(json.name);
    const library = setting === undefined ? field.optimize === true : setting !== false;
    const options = isRecord(setting) ? setting : field;
    const path = (value: unknown) => {
      if (typeof value !== "string") return null;
      const full = resolve(dir, value);
      return inside(dir, full) ? full + sep : null;
    };
    const rootDir = path(options.rootDir);
    const outDir = path(options.outDir);
    return {
      dir,
      library,
      source: library && rootDir !== null && outDir !== null ? { rootDir, outDir } : null,
      deps: [...new Set([...keys(json.dependencies), ...keys(json.peerDependencies), ...keys(json.optionalDependencies)])],
    };
  }

  /** The package `file` belongs to. */
  private packageOf(file: string): PackageInfo | null {
    const visited: string[] = [];
    let found: PackageInfo | null = null;
    for (let dir = dirname(file); ; dir = dirname(dir)) {
      const cached = this.packages.get(dir);
      if (cached !== undefined) {
        found = cached;
        break;
      }
      visited.push(dir);
      found = this.packageIn(dir);
      if (found !== null || dirname(dir) === dir) break;
    }
    for (const dir of visited) this.packages.set(dir, found);
    return found;
  }

  /** Whether module `id` is a file of a library compiled like the app's own code. */
  isLibraryFile(id: string): boolean {
    return !id.startsWith("\0") && this.packageOf(cleanId(id))?.library === true;
  }

  /** The source a compiled file of a library comes from, or null when it is not compiled from its sources. */
  sourceFile(file: string): string | null {
    const source = this.packageOf(file)?.source;
    if (source == null || !inside(source.outDir, file)) return null;
    const relative = file.slice(source.outDir.length);
    const extension = /\.[^./\\]+$/.exec(relative)?.[0] ?? "";
    const candidates = SOURCE_EXTENSIONS.get(extension);
    if (candidates === undefined) return null;
    const base = join(source.rootDir, relative.slice(0, -extension.length));
    return candidates.map((candidate) => base + candidate).find((candidate) => existsSync(candidate)) ?? null;
  }

  /** Whether resolving `specifier` from `importer` may land in a compiled file that has a source. */
  mayResolveToSource(specifier: string, importer: string | undefined): boolean {
    if (specifier.startsWith("\0")) return false;
    if (!specifier.startsWith(".") && !specifier.startsWith("/")) return this.sourceNames.has(packageName(specifier));
    if (importer === undefined || importer.startsWith("\0")) return false;
    const file = cleanId(importer);
    const source = this.packageOf(file)?.source;
    return source != null && inside(source.outDir, file);
  }

  /** The libraries the app depends on, directly or through other libraries, and those the option names. */
  discover(root: string): string[] {
    const found = new Set<string>();
    const visited = new Set<string>();
    const json = readJson(join(root, "package.json"));
    const deps = json === null ? [] : [
      ...keys(json.dependencies), ...keys(json.devDependencies), ...keys(json.peerDependencies), ...keys(json.optionalDependencies),
    ];
    const queue = [{ dir: root, deps }];
    // Grows while it is walked: an array iterator reads the length at every step.
    for (const next of queue) {
      for (const dep of next.deps) {
        const installed = this.installed(dep, next.dir);
        if (installed?.library !== true) continue;
        found.add(dep);
        if (installed.source !== null) this.sourceNames.add(dep);
        if (visited.has(installed.dir)) continue;
        visited.add(installed.dir);
        queue.push({ dir: installed.dir, deps: installed.deps });
      }
    }
    for (const [name, value] of Object.entries(this.option)) {
      if (value !== false && !name.endsWith("/*")) found.add(name);
    }
    return [...found];
  }

  /** The package `name` resolves to from `dir`, as Node looks it up. */
  private installed(name: string, dir: string): PackageInfo | null {
    for (let current = dir; ; current = dirname(current)) {
      const candidate = join(current, "node_modules", name);
      if (existsSync(join(candidate, "package.json"))) {
        const real = realpathSync(candidate);
        const info = this.packageIn(real);
        this.packages.set(real, info);
        return info;
      }
      if (dirname(current) === current) return null;
    }
  }
}

type ResolveSkippingSelf = (source: string, importer: string | undefined) => Promise<Rolldown.PartialResolvedId | null>;

// The compiled file a module resolves to, swapped for its source when the library has one.
async function resolveToSource(libraries: Libraries, resolveSkippingSelf: ResolveSkippingSelf, source: string, importer: string | undefined) {
  if (!libraries.mayResolveToSource(source, importer)) return null;
  const resolved = await resolveSkippingSelf(source, importer);
  if (resolved === null || (resolved.external !== undefined && resolved.external !== false)) return resolved;
  const file = cleanId(resolved.id);
  const sourceFile = libraries.sourceFile(file);
  return sourceFile === null ? resolved : { ...resolved, id: sourceFile + resolved.id.slice(file.length) };
}

// The JSX runtime the library is written against, pinned in a comment that leads the file: the app
// configures the one of its own files, and the dependency optimizer has none.
function pinJsxRuntime(libraries: Libraries, code: string, id: string) {
  const file = cleanId(id);
  if (!JSX_FILE.test(file) || code.includes("@jsxImportSource") || !libraries.isLibraryFile(id)) return null;
  const out = new MappedOutput(code);
  out.insert(JSX_PRAGMA, 0);
  out.copy(0, code.length);
  return out.result(file);
}

/**
 * The same transforms, for Vite's dependency optimizer: it bundles the dependencies it pre-bundles
 * before any Vite plugin sees them. Vite keys its cache of pre-bundled dependencies on the names of
 * these plugins, so the first one carries a hash of what they do.
 */
export function prebundlePlugins(libraries: Libraries, transforms: LibraryTransforms): Rolldown.Plugin[] {
  const isLibrary = (id: string) => libraries.isLibraryFile(id);
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ option: libraries.option, keyedLists: transforms.keyedLists, templates: transforms.templates?.toString() }))
    .digest("hex")
    .slice(0, 8);
  const plugins: Rolldown.Plugin[] = [{
    name: `praxisjs:libraries(${fingerprint})`,
    resolveId(source, importer, options) {
      return resolveToSource(libraries, (s, i) => this.resolve(s, i, { ...options, skipSelf: true }), source, importer);
    },
  }];
  if (transforms.keyedLists) {
    plugins.push({
      name: "praxisjs:keyed-lists",
      transform(code, id) {
        if (!JSX_FILE.test(cleanId(id)) || !isLibrary(id)) return null;
        const result = transformKeyedLists(code, cleanId(id));
        return result?.map == null ? null : { code: result.code, map: result.map };
      },
    });
  }
  plugins.push({
    name: "praxisjs:decorators",
    resolveId(id) {
      return id === HELPERS_ID ? `\0${HELPERS_ID}` : null;
    },
    load(id) {
      return id === `\0${HELPERS_ID}` ? helpersModule() : null;
    },
    transform(code, id) {
      if (!isLibrary(id)) return null;
      return transformDecorators(code, id, isLibrary, (message) => { this.warn(message); });
    },
  });
  const { templates } = transforms;
  if (templates !== null) {
    plugins.push({
      name: "praxisjs:templates",
      transform(code, id) {
        return templates.test(id) && isLibrary(id) ? transformTemplates(code, cleanId(id)) : null;
      },
    });
  }
  plugins.push({
    name: "praxisjs:libraries-jsx",
    transform(code, id) {
      return pinJsxRuntime(libraries, code, id);
    },
  });
  return plugins;
}

/**
 * Lets the other PraxisJS plugins compile the libraries that opt in: runs them inside Vite's
 * dependency optimizer too, keeps the libraries out of SSR externals (Node would load them as
 * published), loads their sources in place of their build output, and pins the JSX runtime their
 * files compile against.
 */
export function librariesPlugin(libraries: Libraries, transforms: LibraryTransforms): Plugin {
  return {
    name: "praxisjs:libraries",
    enforce: "pre",
    config(config) {
      const found = libraries.discover(resolve(config.root ?? process.cwd()));
      if (found.length === 0) return null;
      return {
        optimizeDeps: { rolldownOptions: { plugins: prebundlePlugins(libraries, transforms) } },
        ssr: { noExternal: found },
      };
    },
    buildStart() {
      libraries.clear();
    },
    resolveId(source, importer, options) {
      return resolveToSource(libraries, (s, i) => this.resolve(s, i, { ...options, skipSelf: true }), source, importer);
    },
    transform(code, id) {
      // After the other transforms that add imports at the top, so the pragma still leads the file.
      return pinJsxRuntime(libraries, code, id);
    },
  };
}
