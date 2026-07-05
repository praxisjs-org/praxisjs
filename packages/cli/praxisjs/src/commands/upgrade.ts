import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { cwd, exit } from "node:process";

import { intro, note, outro, spinner } from "@clack/prompts";
import pc from "picocolors";

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const;
type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

interface Update {
  name: string;
  field: DependencyField;
  from: string;
  to: string;
}

function detectInstallCommand(root: string): [string, string[]] {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return ["pnpm", ["install"]];
  if (fs.existsSync(path.join(root, "yarn.lock"))) return ["yarn", []];
  if (fs.existsSync(path.join(root, "bun.lockb"))) return ["bun", ["install"]];
  return ["npm", ["install"]];
}

function splitRange(range: string): { prefix: string; version: string } | undefined {
  const match = /^([\^~])?(\d+\.\d+\.\d+.*)$/.exec(range);
  return match ? { prefix: match[1] || "", version: match[2] } : undefined;
}

async function fetchLatestVersion(name: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { version?: string };
    return data.version;
  } catch {
    return undefined;
  }
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

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, Record<string, string> | undefined>;

  const s = spinner();
  s.start("Checking @praxisjs/* versions...");

  const updates: Update[] = [];

  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg[field];
    if (!deps) continue;

    for (const [name, range] of Object.entries(deps)) {
      if (!name.startsWith("@praxisjs/") || range.startsWith("workspace:")) continue;

      const parsed = splitRange(range);
      if (!parsed) continue;

      const latest = await fetchLatestVersion(name);
      if (!latest || latest === parsed.version) continue;

      const to = `${parsed.prefix}${latest}`;
      deps[name] = to;
      updates.push({ name, field, from: range, to });
    }
  }

  if (updates.length === 0) {
    s.stop("Already up to date.");
    outro(pc.green("Nothing to upgrade."));
    return;
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  s.stop(`Updated ${String(updates.length)} package${updates.length === 1 ? "" : "s"}.`);

  note(updates.map((u) => `${u.name}: ${u.from} → ${u.to}`).join("\n"), "Updated");

  const [cmd, args] = detectInstallCommand(root);
  const installSpinner = spinner();
  installSpinner.start(`Running ${cmd} install...`);
  try {
    execFileSync(cmd, args, { cwd: root, stdio: "ignore" });
    installSpinner.stop("Dependencies installed.");
  } catch {
    installSpinner.stop(`Install failed — run \`${cmd} ${args.join(" ")}\` manually.`);
  }

  outro(pc.green("Upgrade complete!"));
}
