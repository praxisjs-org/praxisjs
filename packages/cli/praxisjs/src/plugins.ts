import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { note } from "@clack/prompts";
import pc from "picocolors";

import type { PluginName } from "./constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.resolve(__dirname, "..");
const PLUGINS_DIR = path.join(PACKAGE_DIR, "plugins");
const SHARED_DIR = path.join(PLUGINS_DIR, "shared");

export const MCP_SERVER_NAME = "praxisjs";
export const MCP_SERVER = { command: "npx", args: ["-y", "@praxisjs/mcp"] };
/** What `praxisjs ai add`/`sync` installed, per integration, with a hash of every file as written. */
export const LOCK_FILE = ".praxisjs-ai.lock.json";

const CODEX_TABLE = /^\[mcp_servers\.praxisjs(?:\]|\.)/;
const CODEX_SERVER = `[mcp_servers.${MCP_SERVER_NAME}]
command = "npx"
args = ["-y", "@praxisjs/mcp"]
`;

type JsonObject = Record<string, unknown>;
export type Integration = Exclude<PluginName, "none">;

export interface AiLock {
  lockVersion: 1;
  integrations: Partial<Record<Integration, { version: string; files: Record<string, string> }>>;
}

/**
 * - `create`: missing, will be written
 * - `update`: an unedited older copy, replaced
 * - `unchanged`: already current
 * - `edited`: differs from what was installed; replaced only when confirmed
 * - `remove`: an unedited file the current version no longer ships
 * - `remove-edited`: same, but edited; removed only when confirmed
 */
export type FileAction = "create" | "update" | "unchanged" | "edited" | "remove" | "remove-edited";

export interface PlannedFile {
  /** Project-relative, forward slashes. */
  path: string;
  action: FileAction;
  current?: string;
  next?: string;
  /** The shipped file `next` comes from. */
  source?: string;
}

export interface ConfigChange {
  file: string;
  before?: string;
  after?: string;
}

export interface SyncPlan {
  plugin: Integration;
  /** Installed by a release that kept no lock (before `ai sync` existed). */
  legacy: boolean;
  files: PlannedFile[];
  configs: ConfigChange[];
  warnings: string[];
}

export interface SyncResult {
  written: string[];
  removed: string[];
  kept: string[];
  configs: string[];
  warnings: string[];
}

export function hashContent(content: string): string {
  return `sha256-${createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex")}`;
}

function cliVersion(): string {
  const { version } = JSON.parse(fs.readFileSync(path.join(PACKAGE_DIR, "package.json"), "utf-8")) as { version?: string };
  return version ?? "0.0.0";
}

function readText(file: string): string | undefined {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : undefined;
}

/** The DX skills installed next to the main `praxisjs` skill, shared by every integration. */
export function sharedSkillNames(): string[] {
  const dir = path.join(SHARED_DIR, "skills");
  return fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
}

function skillsDir(plugin: Integration): string {
  return plugin === "claude-skill" ? ".claude/skills" : ".agents/skills";
}

/** Files under `dir` as [relative path, absolute path]; a file passed as `dir` is returned itself. */
function walk(dir: string, prefix = ""): Array<[string, string]> {
  const stat = fs.statSync(dir, { throwIfNoEntry: false });
  if (!stat) return [];
  if (!stat.isDirectory()) return [[path.basename(dir), dir]];
  return fs
    .readdirSync(dir)
    .sort()
    .flatMap((name): Array<[string, string]> => {
      const full = path.join(dir, name);
      return fs.statSync(full).isDirectory() ? walk(full, `${prefix}${name}/`) : [[`${prefix}${name}`, full]];
    });
}

export interface DesiredFile {
  content: string;
  /** The shipped file it is copied from. */
  source: string;
}

/** Every file the current CLI installs for an integration, by project-relative path. */
export function desiredFiles(plugin: Integration): Map<string, DesiredFile> {
  const source =
    plugin === "claude-skill"
      ? path.join(PLUGINS_DIR, "claude-skill", "skills", "praxisjs")
      : path.join(PLUGINS_DIR, "codex-skill", "dot-agents", "skills", "praxisjs");
  const base = skillsDir(plugin);
  const files = new Map<string, DesiredFile>();
  const add = (target: string, full: string) => files.set(target, { content: fs.readFileSync(full, "utf-8"), source: full });
  for (const [rel, full] of walk(source)) add(`${base}/praxisjs/${rel}`, full);
  for (const [rel, full] of walk(path.join(SHARED_DIR, "references"))) add(`${base}/praxisjs/references/${rel}`, full);
  for (const [rel, full] of walk(path.join(SHARED_DIR, "skills"))) add(`${base}/${rel}`, full);
  return files;
}

/** Hashes of every skill file releases before the lock installed, by project-relative path. */
function legacyHashes(): Record<string, string[]> {
  try {
    const { files } = JSON.parse(fs.readFileSync(path.join(PLUGINS_DIR, "legacy-files.json"), "utf-8")) as {
      files?: Record<string, string[]>;
    };
    return files ?? {};
  } catch {
    return {};
  }
}

export function readLock(root: string): AiLock {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(root, LOCK_FILE), "utf-8")) as Partial<AiLock>;
    return { lockVersion: 1, integrations: isObject(value.integrations) ? value.integrations : {} };
  } catch {
    return { lockVersion: 1, integrations: {} };
  }
}

function writeLock(root: string, lock: AiLock): void {
  const integrations = Object.fromEntries(
    Object.entries(lock.integrations)
      .sort(([a], [b]) => Number(a > b) - Number(a < b))
      .map(([name, entry]) => [
        name,
        { version: entry.version, files: Object.fromEntries(Object.entries(entry.files).sort(([a], [b]) => Number(a > b) - Number(a < b))) },
      ]),
  );
  const file = path.join(root, LOCK_FILE);
  if (Object.keys(integrations).length === 0) fs.rmSync(file, { force: true });
  else fs.writeFileSync(file, `${JSON.stringify({ lockVersion: 1, integrations }, null, 2)}\n`);
}

/** Integrations present in the project: a skill on disk or an entry in the lock. */
export function installedIntegrations(root: string): Integration[] {
  const lock = readLock(root);
  return (["claude-skill", "codex-skill"] as const).filter(
    (plugin) => plugin in lock.integrations || fs.existsSync(path.join(root, skillsDir(plugin), "praxisjs", "SKILL.md")),
  );
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function serversOf(config: JsonObject): JsonObject {
  if (!isObject(config.mcpServers)) config.mcpServers = {};
  return config.mcpServers as JsonObject;
}

function dropServer(config: JsonObject): void {
  if (!isObject(config.mcpServers)) return;
  Reflect.deleteProperty(config.mcpServers, MCP_SERVER_NAME);
  if (Object.keys(config.mcpServers).length === 0) Reflect.deleteProperty(config, "mcpServers");
}

function enabledServers(config: JsonObject): string[] {
  return Array.isArray(config.enabledMcpjsonServers)
    ? config.enabledMcpjsonServers.filter((s): s is string => typeof s === "string")
    : [];
}

function stringify(config: JsonObject): string | undefined {
  return Object.keys(config).length === 0 ? undefined : `${JSON.stringify(config, null, 2)}\n`;
}

/**
 * The next content of a JSON config after `change`, or a warning when the file exists but is not a
 * JSON object (it is then never overwritten).
 */
function planJson(root: string, file: string, change: (config: JsonObject) => void, warnings: string[]): ConfigChange | undefined {
  const before = readText(path.join(root, file));
  let config: unknown = {};
  if (before !== undefined) {
    try {
      config = JSON.parse(before);
    } catch {
      warnings.push(`${file} is not valid JSON: left it unchanged, add the praxisjs MCP server to it by hand.`);
      return undefined;
    }
    if (!isObject(config)) {
      warnings.push(`${file} is not a JSON object: left it unchanged, add the praxisjs MCP server to it by hand.`);
      return undefined;
    }
  }
  change(config as JsonObject);
  const after = stringify(config as JsonObject);
  return after === before ? undefined : { file, before, after };
}

function withoutCodexServer(toml: string): string {
  const kept: string[] = [];
  let skipping = false;
  for (const line of toml.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("[")) skipping = CODEX_TABLE.test(trimmed);
    if (!skipping) kept.push(line);
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** The `[mcp_servers.praxisjs]` table as written in a Codex config, or undefined. */
function codexServerTable(toml: string): string | undefined {
  const lines = toml.split("\n");
  const start = lines.findIndex((line) => line.trim().startsWith("[mcp_servers.praxisjs]"));
  if (start === -1) return undefined;
  const end = lines.findIndex((line, k) => k > start && line.trim().startsWith("["));
  return `${lines.slice(start, end === -1 ? lines.length : end).join("\n").trim()}\n`;
}

function planConfigs(plugin: Integration, root: string, warnings: string[]): ConfigChange[] {
  const changes: ConfigChange[] = [];
  if (plugin === "claude-skill") {
    // Claude Code reads project MCP servers from .mcp.json; settings.json only approves them.
    const mcp = planJson(
      root,
      ".mcp.json",
      (config) => {
        const servers = serversOf(config);
        const current = servers[MCP_SERVER_NAME];
        // A server pointed at a local install (`./node_modules/.bin/praxisjs-mcp`) is a deliberate choice.
        const local = isObject(current) && typeof current.command === "string" && current.command.endsWith("praxisjs-mcp");
        if (!local) servers[MCP_SERVER_NAME] = { ...(isObject(current) ? current : {}), ...MCP_SERVER };
      },
      warnings,
    );
    const settings = planJson(
      root,
      ".claude/settings.json",
      (config) => {
        // Releases before this one wrote the server into settings.json, where Claude Code ignores it.
        dropServer(config);
        config.enabledMcpjsonServers = [...new Set([...enabledServers(config), MCP_SERVER_NAME])];
      },
      warnings,
    );
    return [mcp, settings].filter((c): c is ConfigChange => c !== undefined);
  }

  const before = readText(path.join(root, ".codex/config.toml"));
  const table = before === undefined ? undefined : codexServerTable(before);
  if (table !== CODEX_SERVER) {
    const rest = before === undefined ? "" : withoutCodexServer(before);
    changes.push({ file: ".codex/config.toml", before, after: rest === "" ? CODEX_SERVER : `${rest}\n\n${CODEX_SERVER}` });
  }
  if (!fs.existsSync(path.join(root, "AGENTS.md"))) {
    changes.push({ file: "AGENTS.md", after: fs.readFileSync(path.join(PLUGINS_DIR, "codex-skill", "AGENTS.md"), "utf-8") });
  }
  return changes;
}

/**
 * Compares what an integration has on disk with what this CLI installs. Files the CLI wrote (by
 * the lock, or by the hashes of earlier releases) are replaced or removed freely; anything else that
 * differs is a local edit and only changes when the caller confirms it.
 */
export function planSync(plugin: Integration, root: string): SyncPlan {
  const warnings: string[] = [];
  const lockEntry = readLock(root).integrations[plugin];
  const legacy = legacyHashes();
  const desired = desiredFiles(plugin);
  const installedHash = (file: string, hash: string) =>
    lockEntry?.files[file] === hash || (legacy[file] ?? []).includes(hash);

  const files: PlannedFile[] = [];
  for (const [file, { content: next, source }] of desired) {
    const current = readText(path.join(root, file));
    if (current === undefined) files.push({ path: file, action: "create", next, source });
    else if (hashContent(current) === hashContent(next)) files.push({ path: file, action: "unchanged", current, next, source });
    else files.push({ path: file, action: installedHash(file, hashContent(current)) ? "update" : "edited", current, next, source });
  }

  const known = new Set([...Object.keys(lockEntry?.files ?? {}), ...Object.keys(legacy).filter((f) => f.startsWith(`${skillsDir(plugin)}/`))]);
  for (const file of [...known].sort()) {
    if (desired.has(file)) continue;
    const current = readText(path.join(root, file));
    if (current === undefined) continue;
    files.push({ path: file, action: installedHash(file, hashContent(current)) ? "remove" : "remove-edited", current });
  }

  return {
    plugin,
    legacy: lockEntry === undefined && fs.existsSync(path.join(root, skillsDir(plugin), "praxisjs", "SKILL.md")),
    files,
    configs: planConfigs(plugin, root, warnings),
    warnings,
  };
}

/** Whether applying the plan would change anything without asking. */
export function hasPendingChanges(plan: SyncPlan): boolean {
  return plan.configs.length > 0 || plan.files.some((f) => f.action === "create" || f.action === "update" || f.action === "remove");
}

function removeEmptyDirs(root: string, file: string, stop: string): void {
  for (let dir = path.dirname(path.join(root, file)); dir !== path.join(root, stop) && dir.startsWith(root); dir = path.dirname(dir)) {
    if (!fs.existsSync(dir) || fs.readdirSync(dir).length > 0) return;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Applies a plan. `edited` / `remove-edited` files change only when their path is in `approved`;
 * everything else is applied. The lock then records the hash of every file this CLI owns.
 */
export function applySync(plan: SyncPlan, root: string, approved: ReadonlySet<string> = new Set()): SyncResult {
  const result: SyncResult = { written: [], removed: [], kept: [], configs: [], warnings: [...plan.warnings] };
  const lock = readLock(root);
  const owned: Record<string, string> = {};

  for (const file of plan.files) {
    const target = path.join(root, file.path);
    const needsApproval = file.action === "edited" || file.action === "remove-edited";
    if (needsApproval && !approved.has(file.path)) {
      result.kept.push(file.path);
      // A kept edit stays tracked under the hash of what the CLI would have written, so the next sync
      // still sees it as edited instead of as an unedited old copy.
      if (file.next !== undefined) owned[file.path] = hashContent(file.next);
      continue;
    }
    if (file.action === "remove" || file.action === "remove-edited") {
      fs.rmSync(target, { force: true });
      removeEmptyDirs(root, file.path, skillsDir(plan.plugin));
      result.removed.push(file.path);
      continue;
    }
    if (file.action !== "unchanged") {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(String(file.source), target);
      result.written.push(file.path);
    }
    owned[file.path] = hashContent(String(file.next));
  }

  for (const change of plan.configs) {
    // Syncing only ever adds the server, so a config never ends up empty here.
    const target = path.join(root, change.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, String(change.after));
    result.configs.push(change.file);
  }

  lock.integrations[plan.plugin] = { version: cliVersion(), files: owned };
  writeLock(root, lock);
  return result;
}

/**
 * Installs or updates an integration without asking: locally edited files are kept. Returns
 * warnings about files it could not update.
 */
export function applyPlugin(plugin: PluginName, root: string): string[] {
  if (plugin === "none") return [];
  const result = applySync(planSync(plugin, root), root);
  return [...result.warnings, ...result.kept.map((file) => `${file} has local edits: kept it. Run \`praxisjs ai sync\` to review it.`)];
}

/** Removes what the CLI installed, leaving the developer's other skills and servers in place. */
export function removePlugin(plugin: PluginName, root: string): string[] {
  const warnings: string[] = [];
  if (plugin === "none") return warnings;
  const target = path.join(root, skillsDir(plugin));
  for (const name of ["praxisjs", ...sharedSkillNames()]) {
    fs.rmSync(path.join(target, name), { recursive: true, force: true });
  }
  const lock = readLock(root);
  Reflect.deleteProperty(lock.integrations, plugin);
  writeLock(root, lock);

  const apply = (change: ConfigChange | undefined) => {
    if (!change) return;
    if (change.after === undefined) fs.rmSync(path.join(root, change.file), { force: true });
    else fs.writeFileSync(path.join(root, change.file), change.after);
  };

  if (plugin === "claude-skill") {
    if (fs.existsSync(path.join(root, ".mcp.json"))) apply(planJson(root, ".mcp.json", dropServer, warnings));
    if (fs.existsSync(path.join(root, ".claude", "settings.json"))) {
      apply(
        planJson(
          root,
          ".claude/settings.json",
          (config) => {
            dropServer(config);
            const enabled = enabledServers(config).filter((s) => s !== MCP_SERVER_NAME);
            if (enabled.length > 0) config.enabledMcpjsonServers = enabled;
            else Reflect.deleteProperty(config, "enabledMcpjsonServers");
          },
          warnings,
        ),
      );
    }
    return warnings;
  }

  const codexConfig = path.join(root, ".codex", "config.toml");
  if (fs.existsSync(codexConfig)) {
    const rest = withoutCodexServer(fs.readFileSync(codexConfig, "utf-8"));
    if (rest === "") fs.rmSync(codexConfig, { force: true });
    else fs.writeFileSync(codexConfig, `${rest}\n`);
  }
  return warnings;
}

export function noteRemovedPlugin(plugin: PluginName): void {
  if (plugin === "claude-skill") {
    note(
      [
        pc.dim("Removed") + " .claude/skills/praxisjs*/",
        pc.dim("Removed") + " the praxisjs server from .mcp.json and .claude/settings.json",
        pc.dim("Left untouched:") + " CLAUDE.md, .praxisjs-ai.json, .praxis/",
      ].join("\n"),
      "Claude Code",
    );
    return;
  }

  if (plugin === "codex-skill") {
    note(
      [
        pc.dim("Removed") + " .agents/skills/praxisjs*/",
        pc.dim("Removed") + " the praxisjs server from .codex/config.toml",
        pc.dim("Left untouched:") + " AGENTS.md, .praxisjs-ai.json, .praxis/",
      ].join("\n"),
      "Codex",
    );
  }
}

export function notePlugin(plugin: PluginName): void {
  if (plugin === "claude-skill") {
    note(
      [
        pc.dim("Skills installed at") + " .claude/skills/praxisjs*/",
        pc.dim("MCP server added to") + " .mcp.json " + pc.dim("(enabled in .claude/settings.json)"),
        pc.dim("Approve it when Claude Code asks, check with") + " /mcp",
        pc.dim("Docs:") + " praxisjs.org/docs/guide/ai-skills",
      ].join("\n"),
      "Claude Code",
    );
    return;
  }

  if (plugin === "codex-skill") {
    note(
      [
        pc.dim("Skills installed at") + " .agents/skills/praxisjs*/",
        pc.dim("AGENTS.md created at project root (if missing)"),
        pc.dim("MCP server added to") + " .codex/config.toml " + pc.dim("(loaded in trusted projects)"),
        pc.dim("Docs:") + " praxisjs.org/docs/guide/ai-skills",
      ].join("\n"),
      "Codex",
    );
  }
}
