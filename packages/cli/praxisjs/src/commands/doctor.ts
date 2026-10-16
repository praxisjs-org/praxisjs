import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { cwd, exit } from "node:process";

import { intro, note, outro } from "@clack/prompts";
import pc from "picocolors";

import { hasPendingChanges, installedIntegrations, MCP_SERVER_NAME, planSync, sharedSkillNames } from "../plugins";
import { compareVersions, splitRange } from "../versions";

interface Check {
  ok: boolean;
  message: string;
}

type Manifest = Record<string, unknown>;

interface Requirement {
  pkg: string;
  from: string;
  needs: string;
  min: string;
  why: string;
}

// Packages released together that only work as a set. @praxisjs/* packages depend on each other at
// exact versions, so a mismatch also installs a second copy of the lower package.
const REQUIREMENTS: Requirement[] = [
  {
    pkg: "@praxisjs/vite-plugin",
    from: "4.1.0",
    needs: "@praxisjs/runtime",
    min: "0.8.0",
    why: "its compiled templates and keyed-list rewrite import For and the template helpers from it",
  },
  {
    pkg: "@praxisjs/jsx",
    from: "0.8.0",
    needs: "@praxisjs/runtime",
    min: "0.8.0",
    why: "it mounts fragments with the runtime's mountChildren",
  },
  {
    pkg: "@praxisjs/decorators",
    from: "1.8.0",
    needs: "@praxisjs/core",
    min: "2.3.0",
    why: "@Selector is built on core's selector()",
  },
];

function declaredDependencies(pkg: Manifest): Record<string, string> {
  return {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
}

function checkPraxisProject(root: string): { check: Check; pkg?: Manifest } {
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { check: { ok: false, message: "No package.json found in the current directory." } };
  }

  let pkg: Manifest;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Manifest;
  } catch {
    return { check: { ok: false, message: "package.json exists but could not be parsed as JSON." } };
  }

  const hasPraxisDep = Object.keys(declaredDependencies(pkg)).some((name) => name.startsWith("@praxisjs/"));

  return hasPraxisDep
    ? { check: { ok: true, message: "package.json declares @praxisjs/* dependencies." }, pkg }
    : { check: { ok: false, message: "No @praxisjs/* dependencies found — is this a PraxisJS project?" } };
}

/** The installed version when node_modules has it, otherwise the version the declared range names. */
function resolvedVersion(root: string, deps: Record<string, string>, name: string): string | undefined {
  if (!Object.hasOwn(deps, name)) return undefined;
  const range = deps[name];
  const installedPath = path.join(root, "node_modules", name, "package.json");
  if (fs.existsSync(installedPath)) {
    try {
      const { version } = JSON.parse(fs.readFileSync(installedPath, "utf-8")) as { version?: unknown };
      if (typeof version === "string" && splitRange(version)) return version;
    } catch {
      // An unreadable install falls back to the declared range.
    }
  }
  return splitRange(range)?.version;
}

function checkVersions(root: string, pkg: Manifest): Check {
  const deps = declaredDependencies(pkg);
  const issues: string[] = [];

  for (const { pkg: name, from, needs, min, why } of REQUIREMENTS) {
    const version = resolvedVersion(root, deps, name);
    if (version === undefined || compareVersions(version, from) < 0) continue;
    const needed = resolvedVersion(root, deps, needs);
    if (!Object.hasOwn(deps, needs)) {
      issues.push(`${name}@${version} needs ${needs} >= ${min} as a dependency: ${why}`);
    } else if (needed !== undefined && compareVersions(needed, min) < 0) {
      issues.push(`${name}@${version} needs ${needs} >= ${min} (found ${needed}): ${why}`);
    }
  }

  return issues.length === 0
    ? { ok: true, message: "@praxisjs/* package versions are compatible." }
    : {
        ok: false,
        message: `Incompatible @praxisjs/* versions — ${issues.join("; ")}. Run \`praxisjs upgrade\` to move every @praxisjs/* package to its latest release.`,
      };
}

function checkTsconfig(root: string): Check {
  const tsconfigPath = path.join(root, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    return { ok: false, message: "No tsconfig.json found in the current directory." };
  }

  let tsconfig: Record<string, unknown>;
  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return { ok: false, message: "tsconfig.json exists but could not be parsed as JSON." };
  }

  const compilerOptions = (tsconfig.compilerOptions ?? {}) as Record<string, unknown>;
  const issues: string[] = [];

  if (compilerOptions.jsxImportSource !== "@praxisjs/jsx") {
    issues.push('"jsxImportSource" must be "@praxisjs/jsx"');
  }
  if (compilerOptions.jsx !== "react-jsx") {
    issues.push('"jsx" must be "react-jsx"');
  }
  if (compilerOptions.useDefineForClassFields !== true) {
    issues.push('"useDefineForClassFields" must be true — otherwise the Vite plugin\'s oxc transform drops decorators');
  }

  return issues.length === 0
    ? { ok: true, message: "tsconfig.json is configured correctly for PraxisJS." }
    : { ok: false, message: `tsconfig.json issue(s): ${issues.join("; ")}.` };
}

/** Shared DX skills missing from `<root>/<skills>` (e.g. `.claude/skills`), as relative paths. */
function missingSkills(root: string, skills: string): string[] {
  return sharedSkillNames()
    .filter((name) => !fs.existsSync(path.join(root, skills, name, "SKILL.md")))
    .map((name) => `${skills}/${name}/`);
}

function hasMcpJsonServer(root: string): boolean {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(root, ".mcp.json"), "utf-8")) as { mcpServers?: Record<string, unknown> };
    return Boolean(config.mcpServers?.[MCP_SERVER_NAME]);
  } catch {
    return false;
  }
}

function hasCodexServer(file: string): boolean {
  return fs.existsSync(file) && /^\[mcp_servers\.praxisjs\]/m.test(fs.readFileSync(file, "utf-8"));
}

function checkClaudeIntegration(root: string): Check | undefined {
  if (!fs.existsSync(path.join(root, ".claude", "skills", "praxisjs", "SKILL.md"))) return undefined;

  const missing = missingSkills(root, ".claude/skills");
  if (!hasMcpJsonServer(root)) missing.push("the praxisjs MCP server in .mcp.json");
  if (!fs.existsSync(path.join(root, "CLAUDE.md"))) missing.push("CLAUDE.md");
  if (!fs.existsSync(path.join(root, ".praxisjs-ai.json"))) missing.push(".praxisjs-ai.json");

  return missing.length === 0
    ? { ok: true, message: "Claude Code integration is installed and initialized correctly." }
    : {
        ok: false,
        message: `Claude Code integration is incomplete — missing ${missing.join(", ")}. Run \`praxisjs ai add\` again for skills and the MCP server; open the project in Claude Code and let it run its session-start checklist for the rest.`,
      };
}

function checkCodexIntegration(root: string): Check | undefined {
  if (!fs.existsSync(path.join(root, ".agents", "skills", "praxisjs", "SKILL.md"))) return undefined;

  const missing = missingSkills(root, ".agents/skills");
  if (!hasCodexServer(path.join(root, ".codex", "config.toml")) && !hasCodexServer(path.join(homedir(), ".codex", "config.toml"))) {
    missing.push("the praxisjs MCP server in .codex/config.toml (or ~/.codex/config.toml)");
  }
  if (!fs.existsSync(path.join(root, "AGENTS.md"))) missing.push("AGENTS.md");
  if (!fs.existsSync(path.join(root, ".praxisjs-ai.json"))) missing.push(".praxisjs-ai.json");

  return missing.length === 0
    ? { ok: true, message: "Codex integration is installed and initialized correctly." }
    : {
        ok: false,
        message: `Codex integration is incomplete — missing ${missing.join(", ")}. Run \`praxisjs ai add\` again for skills and the MCP server; open the project in Codex and let it run its session-start checklist for the rest.`,
      };
}

function checkAiSetup(root: string): Check | undefined {
  const integrations = installedIntegrations(root);
  if (integrations.length === 0) return undefined;
  const outdated = integrations.filter((plugin) => hasPendingChanges(planSync(plugin, root)));
  return outdated.length === 0
    ? { ok: true, message: "AI setup matches this praxisjs version." }
    : {
        ok: false,
        message: `AI setup is outdated (${outdated.join(", ")}): skills or MCP configuration differ from this praxisjs version. Run \`praxisjs ai sync\` (\`--dry-run\` to preview); your edited files are kept unless you confirm.`,
      };
}

export function doctor(): Promise<void> {
  intro(
    pc.bgCyan(pc.bold(pc.black(" PraxisJS "))) +
      "  " +
      pc.dim("project diagnostics"),
  );

  const root = cwd();
  const project = checkPraxisProject(root);
  const checks = [
    project.check,
    project.pkg ? checkVersions(root, project.pkg) : undefined,
    project.pkg ? checkTsconfig(root) : undefined,
    checkClaudeIntegration(root),
    checkCodexIntegration(root),
    checkAiSetup(root),
  ].filter((c): c is Check => c !== undefined);

  note(
    checks.map((c) => `${c.ok ? pc.green("✓") : pc.red("✗")} ${c.message}`).join("\n"),
    "Diagnostics",
  );

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    const count = String(failed.length);
    outro(pc.red(`${count} issue${failed.length === 1 ? "" : "s"} found.`));
    exit(1);
    return Promise.resolve();
  }

  outro(pc.green("Everything looks good!"));
  return Promise.resolve();
}
