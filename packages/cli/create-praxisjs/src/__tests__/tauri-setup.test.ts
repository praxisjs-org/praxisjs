import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addTauri, checkRust, describeFailure, rustHelp, runCommand } from "../tauri/setup";

interface Behavior {
  code?: number | null;
  error?: NodeJS.ErrnoException;
  output?: string;
  run?: (cwd: string) => void;
}

type Handler = (command: string, args: string[], cwd: string) => Behavior;

const spawnMock = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

function handle(handler: Handler): void {
  spawnMock.mockImplementation((command: string, args: string[], options: { cwd: string }) => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
    });
    setImmediate(() => {
      const behavior = handler(command, args, options.cwd);
      behavior.run?.(options.cwd);
      if (behavior.output) child.stdout.emit("data", Buffer.from(behavior.output));
      child.stderr.emit("data", Buffer.from(""));
      if (behavior.error) child.emit("error", behavior.error);
      else child.emit("close", behavior.code ?? 0);
    });
    return child;
  });
}

const fixtures = path.resolve(import.meta.dirname, "fixtures/tauri-init");
const repoTemplates = path.resolve(import.meta.dirname, "../../../../../templates");

/** What `tauri init` writes into the project. */
function generateSrcTauri(cwd: string, withConf = true): void {
  fs.mkdirSync(path.join(cwd, "src-tauri/src"), { recursive: true });
  fs.copyFileSync(path.join(fixtures, "lib.rs"), path.join(cwd, "src-tauri/src/lib.rs"));
  if (withConf) fs.copyFileSync(path.join(fixtures, "tauri.conf.json"), path.join(cwd, "src-tauri/tauri.conf.json"));
}

const dirs: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "praxis-tauri-"));
  dirs.push(dir);
  return dir;
}

/** A freshly scaffolded web project from the workspace template. */
function webProject(template: string): string {
  const root = tempDir();
  fs.cpSync(path.join(repoTemplates, template), root, {
    recursive: true,
    filter: (src) => !/[\\/](node_modules|dist)$/.test(src),
  });
  return root;
}

const originalPlatform = process.platform;
function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", { value: platform });
}

beforeEach(() => {
  spawnMock.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ version: url.includes("cli") ? "2.12.3" : "2.12.4" }),
      }),
    ),
  );
});

afterEach(() => {
  setPlatform(originalPlatform);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("runCommand", () => {
  it("collects output and resolves with the exit code, in CI mode and without a shell outside Windows", async () => {
    setPlatform("darwin");
    handle(() => ({ code: 3, output: "hello" }));
    await expect(runCommand("npx", ["a"], "/project")).resolves.toEqual({ code: 3, output: "hello" });
    const options = spawnMock.mock.calls[0]?.[2] as { cwd: string; shell: boolean; env: Record<string, string> };
    expect(options.cwd).toBe("/project");
    expect(options.shell).toBe(false);
    expect(options.env.CI).toBe("true");
  });

  it("runs through a shell on Windows, where the runners are .cmd shims", async () => {
    setPlatform("win32");
    handle(() => ({}));
    await runCommand("npx", [], "C:\\project");
    expect((spawnMock.mock.calls[0]?.[2] as { shell: boolean }).shell).toBe(true);
  });

  it("resolves with the spawn error instead of rejecting", async () => {
    const error = Object.assign(new Error("spawn npx ENOENT"), { code: "ENOENT" });
    handle(() => ({ error }));
    await expect(runCommand("npx", [], "/")).resolves.toEqual({ code: null, output: "", error });
  });
});

describe("describeFailure", () => {
  it("explains a runner missing from PATH", () => {
    const error = Object.assign(new Error("x"), { code: "ENOENT" });
    expect(describeFailure("bunx", { code: null, output: "", error })).toBe("`bunx` was not found on your PATH.");
  });

  it("reports other spawn errors and exit codes with the end of the output", () => {
    expect(describeFailure("npx", { code: null, output: "", error: new Error("EACCES") })).toBe(
      "`npx` could not start: EACCES",
    );
    const output = Array.from({ length: 12 }, (_, i) => `line ${String(i)}`).join("\r\n");
    const reason = describeFailure("npx", { code: 1, output });
    expect(reason.startsWith("`npx` exited with code 1.\nline 4\n")).toBe(true);
    expect(reason.endsWith("line 11")).toBe(true);
    expect(describeFailure("npx", { code: 1, output: " \n" })).toBe("`npx` exited with code 1.");
  });
});

describe("checkRust", () => {
  it("is ready when cargo runs", async () => {
    handle(() => ({ code: 0 }));
    await expect(checkRust("/")).resolves.toBe("ready");
    expect(spawnMock.mock.calls[0]?.slice(0, 2)).toEqual(["cargo", ["--version"]]);
  });

  it.each([
    ["darwin", "cargo"],
    ["win32", "cargo.exe"],
  ] as const)("detects a rustup install that is not on PATH yet (%s)", async (platform, binary) => {
    setPlatform(platform);
    const cargoHome = tempDir();
    fs.mkdirSync(path.join(cargoHome, "bin"));
    fs.writeFileSync(path.join(cargoHome, "bin", binary), "");
    vi.stubEnv("CARGO_HOME", cargoHome);
    handle(() => ({ error: Object.assign(new Error("x"), { code: "ENOENT" }) }));
    await expect(checkRust("/")).resolves.toBe("not-on-path");
  });

  it("is missing otherwise, looking in ~/.cargo without CARGO_HOME", async () => {
    vi.stubEnv("CARGO_HOME", undefined);
    vi.spyOn(os, "homedir").mockReturnValue(tempDir());
    handle(() => ({ code: 1 }));
    await expect(checkRust("/")).resolves.toBe("missing");
  });
});

describe("rustHelp", () => {
  it("says nothing when Rust is ready", () => {
    expect(rustHelp("ready", "linux")).toBeNull();
  });

  it("explains how to load cargo into PATH per platform", () => {
    expect(rustHelp("not-on-path", "darwin")).toContain('. "$HOME/.cargo/env"');
    expect(rustHelp("not-on-path", "win32")).toContain("Open a new terminal");
  });

  it("lists what to install per platform", () => {
    const mac = rustHelp("missing", "darwin");
    expect(mac).toContain("sh.rustup.rs");
    expect(mac).toContain("xcode-select --install");
    const windows = rustHelp("missing", "win32");
    expect(windows).toContain("rustup-init.exe");
    expect(windows).toContain("WebView2");
    const linux = rustHelp("missing", "linux");
    expect(linux).toContain("WebKitGTK");
    expect(linux).toContain("https://v2.tauri.app/start/prerequisites/");
  });
});

describe("addTauri", () => {
  const options = (root: string) => ({
    root,
    name: "desk",
    template: "router",
    packageManager: "pnpm",
    userAgent: "pnpm/10.0.0 node/v22",
  });

  it("runs the pinned Tauri CLI, then writes the patched project", async () => {
    const root = webProject("router");
    handle((command, _args, cwd) =>
      command === "cargo" ? { code: 0 } : { code: 0, run: () => { generateSrcTauri(cwd); } },
    );

    const result = await addTauri(options(root));

    expect(result).toEqual({ ok: true, warnings: [], rust: "ready" });
    expect(spawnMock.mock.calls[0]?.slice(0, 2)).toEqual([
      "pnpm",
      ["dlx", "@tauri-apps/cli@2.12.3", "init", "--ci", "--frontend-dist", "../dist", "--dev-url", "http://localhost:5173"],
    ]);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@tauri-apps/api"]).toBe("^2.12.4");
    expect(pkg.devDependencies["@tauri-apps/cli"]).toBe("^2.12.3");
    expect(fs.readFileSync(path.join(root, "src/components/greet.tsx"), "utf-8")).toContain('invoke<string>("greet"');
    expect(fs.readFileSync(path.join(root, "src-tauri/src/lib.rs"), "utf-8")).toContain("fn greet(");
    expect(fs.readFileSync(path.join(root, "src-tauri/tauri.conf.json"), "utf-8")).toContain('"beforeDevCommand": "pnpm run dev"');
    expect(fs.readFileSync(path.join(root, "README.md"), "utf-8")).toContain("## Desktop app (Tauri v2)");
  });

  it("falls back to the v2 line when the registry cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const root = webProject("minimal");
    handle((command, _args, cwd) =>
      command === "cargo" ? { code: 1 } : { code: 0, run: () => { generateSrcTauri(cwd); } },
    );

    const result = await addTauri({ ...options(root), template: "minimal", packageManager: "npm", userAgent: "" });

    expect(result.ok).toBe(true);
    expect(spawnMock.mock.calls[0]?.slice(0, 2)).toEqual([
      "npx",
      ["--yes", "@tauri-apps/cli@2", "init", "--ci", "--frontend-dist", "../dist", "--dev-url", "http://localhost:5173"],
    ]);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@tauri-apps/api"]).toBe("^2.0.0");
  });

  it("leaves the web project untouched and removes a partial src-tauri when the CLI fails", async () => {
    const root = webProject("minimal");
    const before = fs.readFileSync(path.join(root, "package.json"), "utf-8");
    handle((_command, _args, cwd) => ({
      code: 1,
      output: "npm error 404 Not Found",
      run: () => { generateSrcTauri(cwd, false); },
    }));

    const result = await addTauri(options(root));

    expect(result).toEqual({ ok: false, reason: "`pnpm` exited with code 1.\nnpm error 404 Not Found" });
    expect(fs.existsSync(path.join(root, "src-tauri"))).toBe(false);
    expect(fs.readFileSync(path.join(root, "package.json"), "utf-8")).toBe(before);
    expect(spawnMock).toHaveBeenCalledOnce();
  });

  it("fails when the CLI exits cleanly without generating tauri.conf.json", async () => {
    const root = webProject("minimal");
    handle(() => ({ code: 0 }));
    const result = await addTauri(options(root));
    expect(result).toEqual({ ok: false, reason: "`pnpm` exited with code 0." });
  });

  it("fails cleanly when a patch cannot be applied", async () => {
    const root = webProject("minimal");
    fs.rmSync(path.join(root, "package.json"));
    handle((_command, _args, cwd) => ({ code: 0, run: () => { generateSrcTauri(cwd); } }));

    const result = await addTauri(options(root));

    expect(result).toEqual({ ok: false, reason: 'Missing "package.json" after `tauri init`.' });
    expect(fs.existsSync(path.join(root, "src-tauri"))).toBe(false);
  });

  it("reports non-Error throws as text", async () => {
    const root = webProject("minimal");
    handle((_command, _args, cwd) => ({ code: 0, run: () => { generateSrcTauri(cwd); } }));
    const parse = vi.spyOn(JSON, "parse").mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising the non-Error branch
      throw "bad json";
    });

    const result = await addTauri(options(root));

    expect(result).toEqual({ ok: false, reason: "bad json" });
    parse.mockRestore();
  });
});
