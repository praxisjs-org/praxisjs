import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveLatestVersion } from "../utils";
import {
  applyTauriPatches,
  dlxCommand,
  pinTauriV2,
  PREREQUISITES_URL,
  tauriInitArgs,
} from "./patches";

export type RustStatus = "ready" | "not-on-path" | "missing";

export interface CommandResult {
  code: number | null;
  output: string;
  error?: NodeJS.ErrnoException;
}

export interface AddTauriOptions {
  root: string;
  name: string;
  template: string;
  packageManager: string;
  userAgent: string;
}

export type AddTauriResult =
  | { ok: true; warnings: string[]; rust: RustStatus }
  | { ok: false; reason: string };

export function runCommand(command: string, args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn(command, args, {
      cwd,
      // npx, pnpm, yarn and bunx are .cmd shims on Windows, which only run through a shell.
      shell: process.platform === "win32",
      env: { ...process.env, CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => {
      resolve({ code: null, output, error });
    });
    child.on("close", (code) => {
      resolve({ code, output });
    });
  });
}

export function describeFailure(command: string, result: CommandResult): string {
  if (result.error?.code === "ENOENT") return `\`${command}\` was not found on your PATH.`;
  const tail = result.output.trim().split(/\r?\n/).slice(-8).join("\n");
  const reason = result.error
    ? `\`${command}\` could not start: ${result.error.message}`
    : `\`${command}\` exited with code ${String(result.code)}.`;
  return tail === "" ? reason : `${reason}\n${tail}`;
}

export async function checkRust(cwd: string): Promise<RustStatus> {
  const result = await runCommand("cargo", ["--version"], cwd);
  if (result.code === 0) return "ready";
  const cargoHome = process.env.CARGO_HOME ?? path.join(os.homedir(), ".cargo");
  const cargo = path.join(cargoHome, "bin", process.platform === "win32" ? "cargo.exe" : "cargo");
  return fs.existsSync(cargo) ? "not-on-path" : "missing";
}

export function rustHelp(status: RustStatus, platform: NodeJS.Platform): string | null {
  if (status === "ready") return null;
  if (status === "not-on-path") {
    return [
      "Rust is installed, but cargo is not on your PATH yet.",
      platform === "win32"
        ? "Open a new terminal so the PATH change made by rustup applies."
        : 'Open a new terminal, or run: . "$HOME/.cargo/env"',
    ].join("\n");
  }
  const lines = [
    "Tauri needs Rust to build the desktop app. The web app runs without it.",
    platform === "win32"
      ? "Install Rust with rustup-init.exe from https://www.rust-lang.org/tools/install"
      : "Install Rust: curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh",
  ];
  if (platform === "darwin") {
    lines.push("Then the Xcode Command Line Tools: xcode-select --install");
  } else if (platform === "win32") {
    lines.push("Then the Microsoft C++ Build Tools (Desktop development with C++) and WebView2.");
  } else {
    lines.push("Then the WebKitGTK and build packages of your distribution.");
  }
  lines.push(`Details: ${PREREQUISITES_URL}`);
  return lines.join("\n");
}

async function resolveTauriVersion(name: string): Promise<{ range: string; spec: string }> {
  try {
    return pinTauriV2(await resolveLatestVersion(name));
  } catch {
    // The Tauri CLI download below reports a real network failure; a registry
    // hiccup here alone should not cost the user the desktop setup.
    return pinTauriV2("");
  }
}

/**
 * Generates `src-tauri/` with the official Tauri CLI, then applies the
 * PraxisJS patches. On failure the project is left exactly as the web
 * scaffold wrote it, without a partial `src-tauri/`.
 */
export async function addTauri(options: AddTauriOptions): Promise<AddTauriResult> {
  const { root, name, template, packageManager, userAgent } = options;
  const [api, cli] = await Promise.all([
    resolveTauriVersion("@tauri-apps/api"),
    resolveTauriVersion("@tauri-apps/cli"),
  ]);

  const tauriDir = path.join(root, "src-tauri");
  const { command, args } = dlxCommand(packageManager, userAgent, `@tauri-apps/cli@${cli.spec}`, tauriInitArgs());
  const result = await runCommand(command, args, root);

  if (result.code !== 0 || !fs.existsSync(path.join(tauriDir, "tauri.conf.json"))) {
    fs.rmSync(tauriDir, { recursive: true, force: true });
    return { ok: false, reason: describeFailure(command, result) };
  }

  const read = (file: string): string | undefined => {
    try {
      return fs.readFileSync(path.join(root, file), "utf-8");
    } catch {
      return undefined;
    }
  };

  let patch: ReturnType<typeof applyTauriPatches>;
  try {
    patch = applyTauriPatches(read, {
      name,
      template,
      packageManager,
      versions: { api: api.range, cli: cli.range },
    });
  } catch (error) {
    fs.rmSync(tauriDir, { recursive: true, force: true });
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }

  for (const [file, content] of Object.entries(patch.files)) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf-8");
  }

  return { ok: true, warnings: patch.warnings, rust: await checkRust(root) };
}
