import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { cwd, execPath, exit, platform } from "node:process";

import { intro, note, outro, spinner } from "@clack/prompts";
import pc from "picocolors";

import { compareVersions, fetchManifest, satisfies, splitRange, type PublishedManifest } from "../versions";
import { offerAiSync } from "./ai/sync";

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const;
type DependencyField = (typeof DEPENDENCY_FIELDS)[number];
type Manifest = Partial<Record<DependencyField, Record<string, string>>>;

const ECOSYSTEMS = [
  { label: "PraxisJS", owns: (name: string) => name.startsWith("@praxisjs/") },
  { label: "Morphos", owns: (name: string) => name.startsWith("@morphos/") },
  { label: "Kosmesis", owns: (name: string) => name === "kosmesis" },
] as const;
type EcosystemLabel = (typeof ECOSYSTEMS)[number]["label"];

/** First `kosmesis` release with the `outdated` command. Older releases run `init` for any unknown command. */
const KOSMESIS_OUTDATED_SINCE = "0.5.0";

type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

const INSTALL_COMMANDS: Record<PackageManager, [string, string[]]> = {
  pnpm: ["pnpm", ["install"]],
  yarn: ["yarn", []],
  bun: ["bun", ["install"]],
  npm: ["npm", ["install"]],
};

const EXEC_COMMANDS: Record<PackageManager, string> = {
  pnpm: "pnpm dlx",
  yarn: "yarn dlx",
  bun: "bunx",
  npm: "npx",
};

// A package-lock.json entry of an ecosystem package, at any depth.
const ECOSYSTEM_LOCK_PATH = /(?:^|\/)node_modules\/(?:@praxisjs\/[^/]+|@morphos\/[^/]+|kosmesis)$/;

interface Candidate {
  field: DependencyField;
  name: string;
  range: string;
  prefix: string;
  version: string;
}

interface Update {
  field: DependencyField;
  name: string;
  from: string;
  to: string;
}

interface Planned {
  name: string;
  /** Installed version, or the highest version the declared ranges name. */
  current: string;
  /** Latest published version, when it is ahead of a declared range. */
  target?: string;
}

interface Plan {
  updates: Update[];
  held: Map<string, string>;
  conflicts: string[];
}

function ecosystemOf(name: string): EcosystemLabel | undefined {
  return ECOSYSTEMS.find((ecosystem) => ecosystem.owns(name))?.label;
}

function detectPackageManager(root: string): PackageManager {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(root, "bun.lock")) || fs.existsSync(path.join(root, "bun.lockb"))) return "bun";
  return "npm";
}

function readJson(file: string): unknown {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as unknown;
  } catch {
    return undefined;
  }
}

function installedPackage(root: string, name: string): { version: string; bin?: unknown } | undefined {
  const data = readJson(path.join(root, "node_modules", name, "package.json")) as
    | { version?: unknown; bin?: unknown }
    | undefined;
  return typeof data?.version === "string" && splitRange(data.version) ? { version: data.version, bin: data.bin } : undefined;
}

function usesKosmesis(root: string, candidates: Candidate[]): boolean {
  if (candidates.some((c) => c.name === "kosmesis")) return true;
  // shadcn/ui writes a components.json too; `styleSystem` is the field only Kosmesis has.
  const config = readJson(path.join(root, "components.json")) as { styleSystem?: unknown } | undefined;
  return typeof config?.styleSystem === "string";
}

/**
 * Picks the latest version of every ecosystem package, then holds back the upgrades that would
 * break a peer range another ecosystem package declares (a Morphos release that needs a newer
 * `@praxisjs/core` than the project gets, for example).
 */
async function plan(root: string, candidates: Candidate[]): Promise<Plan> {
  const names = [...new Set(candidates.map((c) => c.name))];
  // One registry request per package, all at once: a project lists most @praxisjs/* packages.
  const latest = new Map(await Promise.all(names.map(async (name) => [name, await fetchManifest(name)] as const)));

  const versions = new Map<string, Planned>();
  const declared: Array<[Candidate, Planned]> = [];
  for (const candidate of candidates) {
    const { name, version } = candidate;
    const entry = versions.get(name) ?? { name, current: version };
    if (compareVersions(version, entry.current) > 0) entry.current = version;
    const next = latest.get(name)?.version;
    // Never move a dependency backwards, e.g. off a prerelease that is ahead of `latest`.
    if (next !== undefined && compareVersions(next, version) > 0) entry.target = next;
    versions.set(name, entry);
    declared.push([candidate, entry]);
  }
  // Peer checks look at what is really installed, which a caret range may put above its base. A
  // copy outside a declared range is left over from an upgrade whose install failed, and the next
  // install replaces it, so it says nothing about the version the project gets.
  for (const entry of versions.values()) {
    const installed = installedPackage(root, entry.name)?.version;
    if (installed === undefined) continue;
    const ranges = candidates.filter((c) => c.name === entry.name).map((c) => c.range);
    if (ranges.every((range) => satisfies(installed, range) !== false)) entry.current = installed;
  }

  const held = new Map<string, string>();
  const targetOf = (entry: Planned) => (held.has(entry.name) ? undefined : entry.target);
  const plannedOf = (entry: Planned) => targetOf(entry) ?? entry.current;

  const manifests = new Map<string, Promise<PublishedManifest | undefined>>();
  const manifestAt = (name: string, version: string): Promise<PublishedManifest | undefined> => {
    const known = latest.get(name);
    if (known?.version === version) return Promise.resolve(known);
    const key = `${name}@${version}`;
    let manifest = manifests.get(key);
    if (!manifest) {
      manifest = fetchManifest(name, version);
      manifests.set(key, manifest);
    }
    return manifest;
  };

  const hold = (entry: Planned, reason: string) => {
    // @praxisjs/* packages depend on each other at exact versions, so holding one back while
    // the rest move would install a second copy of it.
    const praxis = ecosystemOf(entry.name) === "PraxisJS";
    for (const member of versions.values()) {
      if (member !== entry && !(praxis && ecosystemOf(member.name) === "PraxisJS")) continue;
      if (targetOf(member) === undefined) continue;
      held.set(member.name, member === entry ? reason : `moves together with ${entry.name}`);
    }
  };

  for (;;) {
    const conflicts: string[] = [];
    let changed = false;
    for (const entry of versions.values()) {
      const version = plannedOf(entry);
      const manifest = await manifestAt(entry.name, version);
      for (const [peer, range] of Object.entries(manifest?.peerDependencies ?? {})) {
        const peerEntry = versions.get(peer);
        if (!peerEntry) continue;
        const peerVersion = plannedOf(peerEntry);
        if (satisfies(peerVersion, range) !== false) continue;
        const need = `${entry.name}@${version} needs ${peer} ${range}`;
        if (targetOf(entry) !== undefined) {
          hold(entry, `${need}, the project would have ${peerVersion}`);
          changed = true;
        } else if (targetOf(peerEntry) !== undefined && satisfies(peerEntry.current, range) === true) {
          hold(peerEntry, need);
          changed = true;
        } else {
          conflicts.push(`${need}, found ${peerVersion}`);
        }
      }
    }
    if (!changed) {
      const updates = declared.flatMap(([c, entry]) => {
        const target = targetOf(entry);
        return target !== undefined && compareVersions(target, c.version) > 0
          ? [{ field: c.field, name: c.name, from: c.range, to: `${c.prefix}${target}` }]
          : [];
      });
      return { updates, held, conflicts };
    }
  }
}

function printGroups(candidates: Candidate[], { updates, held }: Plan): void {
  for (const { label } of ECOSYSTEMS) {
    const lines = [
      ...updates.filter((u) => ecosystemOf(u.name) === label).map((u) => `${u.name}: ${u.from} → ${u.to}`),
      ...[...held]
        .filter(([name]) => ecosystemOf(name) === label)
        .map(([name, reason]) => {
          const ranges = [...new Set(candidates.filter((c) => c.name === name).map((c) => c.range))].join(", ");
          return pc.yellow(`${name}: held back at ${ranges} (${reason})`);
        }),
    ];
    if (lines.length > 0) note(lines.join("\n"), label);
  }
}

function kosmesisBin(bin: unknown): string | undefined {
  const entry = typeof bin === "object" && bin !== null ? (bin as Record<string, unknown>).kosmesis : bin;
  return typeof entry === "string" ? entry : undefined;
}

function reportKosmesisComponents(root: string, pm: PackageManager): void {
  const installed = installedPackage(root, "kosmesis");
  const bin = kosmesisBin(installed?.bin);
  if (installed && bin !== undefined && compareVersions(installed.version, KOSMESIS_OUTDATED_SINCE) >= 0) {
    try {
      const output = execFileSync(execPath, [path.join(root, "node_modules", "kosmesis", bin), "outdated"], {
        cwd: root,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 60_000,
      });
      note(output.trim() || "Every Kosmesis component is up to date.", "Kosmesis components");
      return;
    } catch (error) {
      // `outdated` may exit non-zero when it finds something to update, with the report on stdout.
      const stdout = (error as { stdout?: unknown }).stdout;
      if (typeof stdout === "string" && stdout.trim()) {
        note(stdout.trim(), "Kosmesis components");
        return;
      }
    }
  }
  note(
    `Components copied by \`kosmesis add\` are not upgraded here.\n` +
      `Run \`${EXEC_COMMANDS[pm]} kosmesis outdated\` to list the ones with a newer version.`,
    "Kosmesis components",
  );
}

/**
 * npm resolves an install against package-lock.json, whose entries for the upgraded packages still
 * hold the old releases and the exact versions they require of each other, so the new peer ranges
 * can't be satisfied (ERESOLVE, or a crash in npm's peer resolution). Dropping only the ecosystem's
 * entries, and their folders, lets npm resolve them afresh while every other dependency keeps its
 * locked version.
 */
function releaseLockedEcosystem(root: string): void {
  const lockPath = path.join(root, "package-lock.json");
  if (!fs.existsSync(lockPath)) return;
  let lock: { packages?: Record<string, unknown> };
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf-8")) as typeof lock;
  } catch {
    return;
  }
  // A lockfile without `packages` (v1) is rewritten by npm itself.
  const packages = lock.packages;
  if (packages === undefined) return;
  const stale = Object.keys(packages).filter((key) => ECOSYSTEM_LOCK_PATH.test(key));
  if (stale.length === 0) return;
  for (const key of stale) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete packages[key];
    fs.rmSync(path.join(root, key), { recursive: true, force: true });
  }
  // npm's hidden lockfile still lists the removed folders, and npm can trust it over node_modules.
  fs.rmSync(path.join(root, "node_modules", ".package-lock.json"), { force: true });
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
}

/**
 * Ecosystem packages whose installed copy is missing or outside the range package.json declares:
 * an earlier upgrade rewrote package.json but its install failed. A project that was never
 * installed has nothing to repair.
 */
function staleInstalls(root: string, candidates: Candidate[]): string[] {
  if (!fs.existsSync(path.join(root, "node_modules"))) return [];
  return candidates
    .filter(({ name, range }) => {
      const installed = installedPackage(root, name)?.version;
      return installed === undefined || satisfies(installed, range) === false;
    })
    .map(({ name }) => name);
}

/** Runs the package manager's install, freeing npm from the ecosystem's stale lockfile entries first. */
function install(root: string, pm: PackageManager): boolean {
  const [cmd, args] = INSTALL_COMMANDS[pm];
  if (pm === "npm") releaseLockedEcosystem(root);
  const installSpinner = spinner();
  installSpinner.start(`Running ${cmd} install...`);
  try {
    // On Windows the package managers are .cmd scripts, which only run through a shell.
    execFileSync(cmd, args, { cwd: root, stdio: "pipe", shell: platform === "win32" });
    installSpinner.stop("Dependencies installed.");
    return true;
  } catch (error) {
    installSpinner.stop(`Install failed — run \`${[cmd, ...args].join(" ")}\` manually.`);
    const output = installOutput(error);
    if (output !== "") note(output, `${cmd} output`);
    return false;
  }
}

/** The last lines a failed install printed, for the error note. */
function installOutput(error: unknown): string {
  const { stderr, stdout } = (error ?? {}) as { stderr?: Buffer | string | null; stdout?: Buffer | string | null };
  const text = `${stdout?.toString() ?? ""}${stderr?.toString() ?? ""}`.trim();
  return text.split(/\r?\n/).slice(-12).join("\n");
}

export async function upgrade(): Promise<void> {
  intro(
    pc.bgCyan(pc.bold(pc.black(" PraxisJS "))) +
      "  " +
      pc.dim("upgrade dependencies"),
  );

  const root = cwd();
  const pkgPath = path.join(root, "package.json");

  if (!fs.existsSync(pkgPath)) {
    outro(pc.red("No package.json found in the current directory."));
    exit(1);
    return;
  }

  let pkg: Manifest;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Manifest;
  } catch {
    outro(pc.red("package.json exists but could not be parsed as JSON."));
    exit(1);
    return;
  }

  const s = spinner();
  s.start("Checking PraxisJS, Morphos and Kosmesis versions...");

  const candidates: Candidate[] = [];
  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, range] of Object.entries(pkg[field] ?? {})) {
      if (!ecosystemOf(name)) continue;
      const parsed = splitRange(range);
      if (parsed) candidates.push({ field, name, range, ...parsed });
    }
  }

  const result = await plan(root, candidates);
  const { updates, held, conflicts } = result;
  const pm = detectPackageManager(root);
  const kosmesis = usesKosmesis(root, candidates);

  if (updates.length === 0) {
    s.stop(held.size > 0 ? "No upgrade is compatible with the rest of the project." : "Already up to date.");
  } else {
    for (const { field, name, to } of updates) (pkg[field] as Record<string, string>)[name] = to;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    s.stop(`Updated ${String(updates.length)} package${updates.length === 1 ? "" : "s"}.`);
  }

  printGroups(candidates, result);
  if (conflicts.length > 0) {
    note(pc.yellow(conflicts.join("\n")), "Already incompatible");
  }

  // Nothing to upgrade, but an earlier upgrade may have stopped before its install finished.
  const repair = updates.length === 0 ? staleInstalls(root, candidates) : [];
  if (repair.length > 0) {
    note(
      `${repair.join("\n")}\n\nThese don't match package.json — an earlier upgrade did not finish installing. Reinstalling.`,
      "Installed versions out of date",
    );
  }
  const installed = updates.length > 0 || repair.length > 0 ? install(root, pm) : undefined;

  if (kosmesis) reportKosmesisComponents(root, pm);
  await offerAiSync(root);

  if (updates.length > 0) outro(pc.green("Upgrade complete!"));
  else if (repair.length > 0) outro(installed === true ? pc.green("Dependencies repaired.") : pc.yellow("Dependencies still need an install."));
  else outro(pc.green("Nothing to upgrade."));
}
