import fs from "node:fs";
import path from "node:path";
import { argv, cwd, env, exit } from "node:process";

import { cancel, confirm, intro, isCancel, log, note, outro, spinner } from "@clack/prompts";
import pc from "picocolors";

import { printAgentPrompt } from "../../agent-prompts";
import {
  dlx,
  detectPackageManager,
  formatInvocation,
  isKosmesisStyleSystem,
  run,
  setupKosmesis,
  STARTER_COMPONENTS,
  describeFailure,
  type KosmesisStyleSystem,
  type PackageManager,
} from "../../kosmesis";
import { installedIntegrations } from "../../plugins";
import { isInteractive } from "../ai/sync";

/** `kosmesis init` flags passed through as given. */
const INIT_VALUE_FLAGS = ["--icon-library", "--css", "--root-component"];
const INIT_BOOLEAN_FLAGS = ["--erase", "--no-erase", "--overwrite", "--no-overwrite", "--force"];

export interface AddKosmesisArgs {
  styleSystem?: KosmesisStyleSystem;
  components?: string[];
  initFlags: string[];
  /** Any flag was given (`--yes` alone included): run without prompts. */
  flags: boolean;
  help: boolean;
}

export class AddKosmesisArgsError extends Error {}

export function parseAddKosmesisArgs(args: readonly string[]): AddKosmesisArgs {
  const parsed: AddKosmesisArgs = { initFlags: [], flags: args.length > 0, help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const value = (): string => {
      const next = eq === -1 ? args.at(++i) : arg.slice(eq + 1);
      if (next === undefined || next === "" || (eq === -1 && next.startsWith("-"))) {
        throw new AddKosmesisArgsError(`Missing value for ${flag}.`);
      }
      return next;
    };

    if (flag === "--style-system") {
      const styleSystem = value();
      if (!isKosmesisStyleSystem(styleSystem)) {
        throw new AddKosmesisArgsError(`Invalid value "${styleSystem}" for --style-system. Expected tailwind or praxisjs-css.`);
      }
      parsed.styleSystem = styleSystem;
    } else if (flag === "--components") {
      parsed.components = value()
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
    } else if (arg === "-h" || arg === "--help") {
      parsed.help = true;
    } else if (arg === "-y" || arg === "--yes") {
      continue;
    } else if (INIT_VALUE_FLAGS.includes(flag)) {
      parsed.initFlags.push(flag, value());
    } else if (INIT_BOOLEAN_FLAGS.includes(arg)) {
      parsed.initFlags.push(arg);
    } else {
      throw new AddKosmesisArgsError(`Unknown option "${arg}".`);
    }
  }
  return parsed;
}

export const ADD_KOSMESIS_USAGE = [
  "Usage: praxisjs add kosmesis [options]",
  "",
  "--style-system <tailwind|praxisjs-css>",
  "    Styling system (default: tailwind)",
  "--components <a,b>",
  `    Components to add after the setup (e.g. ${STARTER_COMPONENTS.join(",")})`,
  "-y, --yes",
  "    No prompts: every choice not given takes its default",
  "--icon-library, --css, --root-component, --erase, --no-erase, --overwrite, --force",
  "    Passed to `kosmesis init` as given",
  "",
  "Any flag skips the prompts. Without flags, in a terminal, `kosmesis init` asks.",
].join("\n");

export interface ProjectInfo {
  template: "minimal" | "router" | "blog" | "full";
  tauri: boolean;
  ai: boolean;
}

/** What create-praxisjs template (or closest one) the project looks like, from its dependencies. */
export function detectProject(root: string, pkg: Record<string, unknown>): ProjectInfo {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  const template = "@praxisjs/content" in deps
    ? "blog"
    : "@praxisjs/store" in deps && "@praxisjs/di" in deps
      ? "full"
      : "@praxisjs/router" in deps
        ? "router"
        : "minimal";
  return {
    template,
    tauri: fs.existsSync(path.join(root, "src-tauri", "tauri.conf.json")) || "@tauri-apps/api" in deps,
    ai: installedIntegrations(root).length > 0,
  };
}

function readPackageJson(root: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function installInvocation(pm: PackageManager): { command: string; args: string[] } {
  return pm === "yarn" ? { command: "yarn", args: [] } : { command: pm, args: ["install"] };
}

function runScript(pm: PackageManager, script: string): string {
  return pm === "yarn" ? `yarn ${script}` : `${pm} run ${script}`;
}

function fail(message: string): void {
  cancel(message);
  exit(1);
}

/** `praxisjs add kosmesis`: sets Kosmesis up in an existing PraxisJS project. */
export async function addKosmesis(): Promise<void> {
  intro(pc.bgCyan(pc.bold(pc.black(" PraxisJS "))) + "  " + pc.dim("add Kosmesis"));

  let args: AddKosmesisArgs;
  try {
    args = parseAddKosmesisArgs(argv.slice(4));
  } catch (error) {
    fail(`${(error as AddKosmesisArgsError).message}\n\n${ADD_KOSMESIS_USAGE}`);
    return;
  }
  if (args.help) {
    note(ADD_KOSMESIS_USAGE, "praxisjs add kosmesis");
    return;
  }

  const root = cwd();
  const pkg = readPackageJson(root);
  const deps = { ...(pkg?.dependencies as object | undefined), ...(pkg?.devDependencies as object | undefined) };
  if (!pkg || !("@praxisjs/core" in deps)) {
    fail("No PraxisJS project here: run this in a folder whose package.json depends on @praxisjs/core.");
    return;
  }

  const userAgent = env.npm_config_user_agent ?? "";
  const pm = detectPackageManager(root, userAgent);
  const project = detectProject(root, pkg);
  log.info(
    `${pc.dim("Project:")} ${project.template} template${project.tauri ? " + Tauri v2" : ""}, ${pm}` +
      (project.ai ? pc.dim(", AI integration installed") : ""),
  );

  const existing = path.join(root, "components.json");
  if (fs.existsSync(existing)) {
    const config = JSON.parse(fs.readFileSync(existing, "utf-8")) as { styleSystem?: string };
    note(
      [
        `Kosmesis is already set up here (${config.styleSystem ?? "unknown style system"}).`,
        `Add components with ${pc.cyan(formatInvocation(dlx(pm, userAgent, "kosmesis", ["add", "<component>"])))}`,
      ].join("\n"),
      "Kosmesis",
    );
    outro(pc.green("Nothing to do."));
    return;
  }

  // With a terminal and no flags, `kosmesis init` asks its own questions.
  const interactive = !args.flags && isInteractive();
  let components = args.components ?? [];
  if (interactive) {
    const answer = await confirm({
      message: `Add starter components (${STARTER_COMPONENTS.join(", ")}) after the setup?`,
      initialValue: true,
    });
    if (isCancel(answer)) {
      cancel("Operation cancelled");
      return;
    }
    components = answer ? [...STARTER_COMPONENTS] : [];
  }

  if (!fs.existsSync(path.join(root, "node_modules"))) {
    const install = installInvocation(pm);
    const s = spinner();
    s.start(`Installing the project's dependencies (${formatInvocation(install)})`);
    const result = await run(install, root, "pipe");
    if (result.code !== 0) {
      s.stop(pc.red("Install failed."));
      fail(describeFailure(install, result));
      return;
    }
    s.stop("Dependencies installed.");
  }

  const s = spinner();
  if (interactive) log.step(`Running ${pc.cyan("kosmesis init")}`);
  else s.start(`Setting up Kosmesis${components.length > 0 ? ` and adding ${components.join(", ")}` : ""}`);
  const result = await setupKosmesis({
    root,
    packageManager: pm,
    userAgent,
    styleSystem: args.styleSystem,
    initFlags: args.initFlags,
    components,
    interactive,
  });

  if (!result.ok) {
    if (!interactive) s.stop(pc.red("Kosmesis was not set up."));
    log.warn(result.reason);
    note(result.commands.map((c) => pc.cyan(c)).join("\n"), "Run this in the project to finish");
    exit(1);
    return;
  }
  if (!interactive) s.stop(pc.green("Kosmesis is set up."));

  const sample = result.components[0];
  const pascal = (name: string) => name.replace(/(^|-)([a-z])/g, (_, __: string, c: string) => c.toUpperCase());
  note(
    [
      sample
        ? `${pc.dim("Use it:")} import { ${pascal(sample)} } from "@/components/ui/${sample}";`
        : `${pc.dim("Add a component:")} ${pc.cyan(formatInvocation(dlx(pm, userAgent, "kosmesis", ["add", "button"])))}`,
      sample ? `${pc.dim("Add more:")} ${pc.cyan(formatInvocation(dlx(pm, userAgent, "kosmesis", ["add", "<component>"])))}` : null,
      `${pc.dim("Run it:")} ${pc.cyan(runScript(pm, project.tauri ? "tauri:dev" : "dev"))}`,
      `${pc.dim("Components:")} kosmesis.praxisjs.org/docs`,
    ]
      .filter(Boolean)
      .join("\n"),
    "Next steps",
  );

  outro(pc.green("Happy hacking!"));
  if (project.ai) {
    for (const plugin of installedIntegrations(root)) printAgentPrompt(plugin, "map");
  }
}
