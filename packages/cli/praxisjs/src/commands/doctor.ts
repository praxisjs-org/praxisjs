import fs from "node:fs";
import path from "node:path";
import { cwd, exit } from "node:process";

import { intro, note, outro } from "@clack/prompts";
import pc from "picocolors";

interface Check {
  ok: boolean;
  message: string;
}

function checkPraxisProject(root: string): Check {
  const pkgPath = path.join(root, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { ok: false, message: "No package.json found in the current directory." };
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return { ok: false, message: "package.json exists but could not be parsed as JSON." };
  }

  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  const hasPraxisDep = Object.keys(deps).some((name) => name.startsWith("@praxisjs/"));

  return hasPraxisDep
    ? { ok: true, message: "package.json declares @praxisjs/* dependencies." }
    : { ok: false, message: "No @praxisjs/* dependencies found — is this a PraxisJS project?" };
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

function checkClaudeIntegration(root: string): Check | undefined {
  const hasSkill = fs.existsSync(path.join(root, ".claude", "skills", "praxisjs", "SKILL.md"));
  if (!hasSkill) return undefined;

  const missing: string[] = [];
  if (!fs.existsSync(path.join(root, ".claude", "settings.json"))) missing.push(".claude/settings.json");
  if (!fs.existsSync(path.join(root, "CLAUDE.md"))) missing.push("CLAUDE.md");
  if (!fs.existsSync(path.join(root, ".praxisjs-ai.json"))) missing.push(".praxisjs-ai.json");

  return missing.length === 0
    ? { ok: true, message: "Claude Code integration is installed and initialized correctly." }
    : {
        ok: false,
        message: `Claude Code integration is incomplete — missing ${missing.join(", ")}. Open the project in Claude Code and let it run its session-start checklist, or run \`praxisjs ai add\` again.`,
      };
}

function checkCodexIntegration(root: string): Check | undefined {
  const hasSkill = fs.existsSync(path.join(root, ".agents", "skills", "praxisjs", "SKILL.md"));
  if (!hasSkill) return undefined;

  const missing: string[] = [];
  if (!fs.existsSync(path.join(root, "AGENTS.md"))) missing.push("AGENTS.md");
  if (!fs.existsSync(path.join(root, ".praxisjs-ai.json"))) missing.push(".praxisjs-ai.json");

  return missing.length === 0
    ? { ok: true, message: "Codex integration is installed and initialized correctly." }
    : {
        ok: false,
        message: `Codex integration is incomplete — missing ${missing.join(", ")}. Open the project in Codex and let it run its session-start checklist, or run \`praxisjs ai add\` again.`,
      };
}

export function doctor(): Promise<void> {
  intro(
    pc.bgCyan(pc.bold(pc.black(" PraxisJS "))) +
      "  " +
      pc.dim("project diagnostics"),
  );

  const root = cwd();
  const projectCheck = checkPraxisProject(root);
  const checks = [
    projectCheck,
    projectCheck.ok ? checkTsconfig(root) : undefined,
    checkClaudeIntegration(root),
    checkCodexIntegration(root),
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
