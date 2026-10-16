import { argv, cwd, env, exit, stdin } from "node:process";

import { confirm, intro, isCancel, log, note, outro } from "@clack/prompts";
import pc from "picocolors";

import { hasMcpServer, printAgentPrompt } from "../../agent-prompts";
import { PLUGINS } from "../../constants";
import { lineDiff } from "../../diff";
import {
  applySync,
  hasPendingChanges,
  installedIntegrations,
  planSync,
  type Integration,
  type PlannedFile,
  type SyncPlan,
  type SyncResult,
} from "../../plugins";

export interface SyncOptions {
  dryRun: boolean;
  interactive: boolean;
}

/** Prompts only make sense on a terminal; CI and piped runs never overwrite edited files. */
export function isInteractive(): boolean {
  // Typed as boolean, but undefined when stdin is a pipe or a file.
  const tty: unknown = stdin.isTTY;
  return tty === true && !env.CI;
}

function displayName(plugin: Integration): string {
  return PLUGINS.find((p) => p.name === plugin)?.display ?? plugin;
}

function colorDiff(diff: string): string {
  return diff
    .split("\n")
    .map((line) => (line.startsWith("+") ? pc.green(line) : line.startsWith("-") ? pc.red(line) : pc.dim(line)))
    .join("\n");
}

const LABELS: Record<PlannedFile["action"], string> = {
  create: "add",
  update: "update",
  unchanged: "unchanged",
  edited: "edited by you",
  remove: "remove (no longer shipped)",
  "remove-edited": "remove, edited by you",
};

export function describePlan(plan: SyncPlan): string {
  const lines: string[] = [];
  if (plan.legacy) lines.push(pc.yellow("Installed by an earlier praxisjs release: updating it in place."));
  for (const file of plan.files) {
    if (file.action === "unchanged") continue;
    lines.push(`${pc.dim(LABELS[file.action].padEnd(24))} ${file.path}`);
  }
  for (const change of plan.configs) {
    lines.push(`${pc.dim((change.before === undefined ? "add" : "update").padEnd(24))} ${change.file}`);
  }
  const unchanged = plan.files.filter((f) => f.action === "unchanged").length;
  if (unchanged > 0) lines.push(pc.dim(`${String(unchanged)} file${unchanged === 1 ? "" : "s"} already current`));
  return lines.join("\n");
}

function describeResult(result: SyncResult): string {
  const parts = [
    `${String(result.written.length)} written`,
    `${String(result.removed.length)} removed`,
    `${String(result.kept.length)} kept with your edits`,
  ];
  if (result.configs.length > 0) parts.push(`config: ${result.configs.join(", ")}`);
  return parts.join(", ");
}

/** Plans, asks about locally edited files when it can, and applies one integration's update. */
export async function syncIntegration(
  plugin: Integration,
  root: string,
  options: SyncOptions,
): Promise<SyncResult | undefined> {
  const plan = planSync(plugin, root);
  const name = displayName(plugin);
  note(describePlan(plan) || pc.dim("Nothing to change."), options.dryRun ? `${name} (dry run)` : name);
  for (const warning of plan.warnings) log.warn(warning);
  if (options.dryRun) return undefined;

  const approved = new Set<string>();
  for (const file of plan.files) {
    if (file.action !== "edited" && file.action !== "remove-edited") continue;
    if (!options.interactive) continue;
    const diff = lineDiff(String(file.current), file.action === "edited" ? String(file.next) : "");
    note(colorDiff(diff), `${file.path}: yours → ${file.action === "edited" ? "new" : "removed"}`);
    const answer = await confirm({
      message:
        file.action === "edited"
          ? `${file.path} has your edits. Replace it with the new version?`
          : `${file.path} has your edits but is no longer shipped. Delete it?`,
      initialValue: false,
    });
    if (!isCancel(answer) && answer) approved.add(file.path);
  }

  const result = applySync(plan, root, approved);
  for (const warning of result.warnings.filter((w) => !plan.warnings.includes(w))) log.warn(warning);
  log.success(`${name}: ${describeResult(result)}`);
  if (result.kept.length > 0 && !options.interactive) {
    log.info("Edited files are never overwritten without a terminal: run `praxisjs ai sync` interactively to review them.");
  }
  return result;
}

/** `praxisjs ai sync [--dry-run]`: brings every installed integration up to this CLI's version. */
export async function sync(): Promise<void> {
  intro(pc.bgCyan(pc.bold(pc.black(" PraxisJS "))) + "  " + pc.dim("sync AI setup"));
  const root = cwd();
  const integrations = installedIntegrations(root);
  if (integrations.length === 0) {
    outro(pc.yellow("No AI integration installed here. Run `praxisjs ai add` to add one."));
    exit(1);
    return;
  }
  const options = { dryRun: argv.includes("--dry-run"), interactive: isInteractive() };
  const withoutServer = integrations.filter((plugin) => !hasMcpServer(plugin, root));
  for (const plugin of integrations) await syncIntegration(plugin, root, options);
  outro(
    options.dryRun
      ? pc.dim("Dry run: nothing was written. Run `praxisjs ai sync` to apply.")
      : pc.green("AI setup is up to date. Ask your agent to run praxisjs_memory_migrate (or the praxisjs-ai-setup skill) for the project memory."),
  );
  for (const plugin of withoutServer) {
    if (hasMcpServer(plugin, root)) printAgentPrompt(plugin, "map");
  }
}

/** After `praxisjs upgrade`: offers to bring an outdated AI setup up to date too. */
export async function offerAiSync(root: string): Promise<void> {
  const outdated = installedIntegrations(root).filter((plugin) => hasPendingChanges(planSync(plugin, root)));
  if (outdated.length === 0) return;
  if (!isInteractive()) {
    log.info(`The AI setup (${outdated.map(displayName).join(", ")}) is outdated: run \`praxisjs ai sync\`.`);
    return;
  }
  const answer = await confirm({ message: "Your AI setup is outdated. Sync it now?", initialValue: true });
  if (isCancel(answer) || !answer) return;
  for (const plugin of outdated) await syncIntegration(plugin, root, { dryRun: false, interactive: true });
}
