import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** First kosmesis release whose `init` takes flags (`--yes`, `--style-system`, ...). */
export const KOSMESIS_RANGE = "^0.6.0";
export const KOSMESIS_SPEC = `kosmesis@${KOSMESIS_RANGE}`;

export const KOSMESIS_STYLE_SYSTEMS = [
  { name: "tailwind", display: "Tailwind CSS", description: "utility classes + class-variance-authority" },
  { name: "praxisjs-css", display: "@praxisjs/css", description: "typed CSS-in-TS, no Tailwind" },
] as const;

export type KosmesisStyleSystem = (typeof KOSMESIS_STYLE_SYSTEMS)[number]["name"];

/** Added by create-praxisjs (and offered by `praxisjs add kosmesis`) so a new project has something to import. */
export const STARTER_COMPONENTS = ["button", "card"] as const;

export function isKosmesisStyleSystem(value: string): value is KosmesisStyleSystem {
  return KOSMESIS_STYLE_SYSTEMS.some((s) => s.name === value);
}

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export function packageManagerFromAgent(userAgent: string): PackageManager {
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("bun")) return "bun";
  return "npm";
}

/** The project's lockfile decides; without one, the package manager running this CLI. */
export function detectPackageManager(root: string, userAgent: string): PackageManager {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(root, "bun.lock")) || fs.existsSync(path.join(root, "bun.lockb"))) return "bun";
  return packageManagerFromAgent(userAgent);
}

export interface Invocation {
  command: string;
  args: string[];
}

/** Runs `spec` without installing it in the project, the way each package manager does it. */
export function dlx(packageManager: string, userAgent: string, spec: string, args: string[]): Invocation {
  if (packageManager === "pnpm") return { command: "pnpm", args: ["dlx", spec, ...args] };
  if (packageManager === "bun") return { command: "bunx", args: [spec, ...args] };
  // Yarn 1 has no `dlx`.
  if (packageManager === "yarn" && !userAgent.startsWith("yarn/1.")) return { command: "yarn", args: ["dlx", spec, ...args] };
  return { command: "npx", args: ["--yes", spec, ...args] };
}

export function kosmesisInvocation(packageManager: string, userAgent: string, args: string[]): Invocation {
  return dlx(packageManager, userAgent, KOSMESIS_SPEC, args);
}

export function formatInvocation({ command, args }: Invocation): string {
  return [command, ...args].join(" ");
}

export function kosmesisInitArgs(styleSystem: KosmesisStyleSystem | undefined, extra: string[] = []): string[] {
  return ["init", "--yes", ...(styleSystem ? ["--style-system", styleSystem] : []), ...extra];
}

export interface RunResult {
  code: number | null;
  output: string;
  error?: NodeJS.ErrnoException;
}

/**
 * `inherit` hands the terminal to the command (its prompts and progress show as they happen);
 * `pipe` collects its output to show only when it fails.
 */
export function run(invocation: Invocation, cwd: string, stdio: "inherit" | "pipe"): Promise<RunResult> {
  return new Promise((resolve) => {
    let output = "";
    const windows = process.platform === "win32";
    const child = spawn(
      invocation.command,
      // cmd.exe reads `^` as an escape character, which would turn `kosmesis@^0.6.0` into an exact version.
      windows ? invocation.args.map((arg) => (arg.includes("^") ? `"${arg}"` : arg)) : invocation.args,
      {
        cwd,
        // npx, pnpm, yarn and bunx are .cmd shims on Windows, which only run through a shell.
        shell: windows,
        stdio: stdio === "inherit" ? "inherit" : ["ignore", "pipe", "pipe"],
      },
    );
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    child.on("error", (error) => {
      resolve({ code: null, output, error });
    });
    child.on("close", (code) => {
      resolve({ code, output });
    });
  });
}

export function describeFailure(invocation: Invocation, result: RunResult): string {
  const command = formatInvocation(invocation);
  if (result.error?.code === "ENOENT") return `\`${invocation.command}\` was not found on your PATH.`;
  const tail = result.output.trim().split(/\r?\n/).slice(-8).join("\n");
  const reason = result.error
    ? `\`${command}\` could not start: ${result.error.message}`
    : `\`${command}\` exited with code ${String(result.code)}.`;
  return tail === "" ? reason : `${reason}\n${tail}`;
}

export interface KosmesisSetupOptions {
  root: string;
  packageManager: string;
  userAgent: string;
  styleSystem?: KosmesisStyleSystem;
  /** Extra `kosmesis init` flags (`--icon-library none`, `--erase`, ...). */
  initFlags?: string[];
  components?: readonly string[];
  /** Lets `kosmesis init` prompt instead of passing `--yes`. */
  interactive?: boolean;
}

export type KosmesisSetupResult =
  | { ok: true; components: string[] }
  | { ok: false; reason: string; commands: string[] };

/**
 * Runs `kosmesis init` (and `kosmesis add` for `components`) in `root` through the project's
 * package manager. On failure it returns the exact commands to run later instead of throwing:
 * the project stays usable without Kosmesis.
 */
export async function setupKosmesis(options: KosmesisSetupOptions): Promise<KosmesisSetupResult> {
  const { root, packageManager, userAgent, styleSystem, initFlags = [], components = [], interactive = false } = options;
  const stdio = interactive ? "inherit" : "pipe";
  const initArgs = interactive ? ["init"] : kosmesisInitArgs(styleSystem, initFlags);
  const init = kosmesisInvocation(packageManager, userAgent, initArgs);
  const add = kosmesisInvocation(packageManager, userAgent, ["add", ...components]);
  const commands = components.length > 0 ? [init, add] : [init];

  const initResult = await run(init, root, stdio);
  if (initResult.code !== 0 || !fs.existsSync(path.join(root, "components.json"))) {
    return {
      ok: false,
      reason: initResult.code === 0 ? "`kosmesis init` stopped before writing components.json." : describeFailure(init, initResult),
      commands: commands.map(formatInvocation),
    };
  }

  if (components.length === 0) return { ok: true, components: [] };

  const addResult = await run(add, root, stdio);
  if (addResult.code !== 0) {
    return { ok: false, reason: describeFailure(add, addResult), commands: [formatInvocation(add)] };
  }
  return { ok: true, components: [...components] };
}
