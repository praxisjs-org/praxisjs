import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawn = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ spawn }));

const {
  describeFailure,
  detectPackageManager,
  dlx,
  formatInvocation,
  isKosmesisStyleSystem,
  KOSMESIS_RANGE,
  kosmesisInitArgs,
  kosmesisInvocation,
  packageManagerFromAgent,
  run,
  setupKosmesis,
} = await import("../kosmesis");

interface FakeChild extends EventEmitter {
  stdout: EventEmitter | null;
  stderr: EventEmitter | null;
}

/** Each spawn emits `output`, then closes with `code` (or fails to start with `error`) and may write files. */
function mockSpawn(...runs: Array<{ code?: number | null; output?: string; error?: NodeJS.ErrnoException; effect?: () => void; inherit?: boolean }>): void {
  for (const step of runs) {
    spawn.mockImplementationOnce(() => {
      const child = new EventEmitter() as FakeChild;
      child.stdout = step.inherit ? null : new EventEmitter();
      child.stderr = step.inherit ? null : new EventEmitter();
      queueMicrotask(() => {
        if (step.output) child.stdout?.emit("data", Buffer.from(step.output));
        step.effect?.();
        if (step.error) child.emit("error", step.error);
        else child.emit("close", step.code ?? 0);
      });
      return child;
    });
  }
}

let root: string;
const originalPlatform = process.platform;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "praxisjs-kosmesis-"));
  spawn.mockReset();
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  Object.defineProperty(process, "platform", { value: originalPlatform });
});

describe("package managers", () => {
  it("reads the package manager from the user agent", () => {
    expect(packageManagerFromAgent("pnpm/10.0.0 node/v22")).toBe("pnpm");
    expect(packageManagerFromAgent("yarn/4.0.0")).toBe("yarn");
    expect(packageManagerFromAgent("bun/1.2.0")).toBe("bun");
    expect(packageManagerFromAgent("")).toBe("npm");
  });

  it("prefers the project's lockfile over the user agent", () => {
    expect(detectPackageManager(root, "pnpm/10")).toBe("pnpm");
    for (const [file, pm] of [
      ["bun.lockb", "bun"],
      ["bun.lock", "bun"],
      ["yarn.lock", "yarn"],
      ["pnpm-lock.yaml", "pnpm"],
    ] as const) {
      fs.writeFileSync(path.join(root, file), "");
      expect(detectPackageManager(root, "npm/10")).toBe(pm);
    }
  });

  it("runs a package without installing it, the way each manager does", () => {
    expect(dlx("pnpm", "", "kosmesis", ["add"])).toEqual({ command: "pnpm", args: ["dlx", "kosmesis", "add"] });
    expect(dlx("bun", "", "kosmesis", [])).toEqual({ command: "bunx", args: ["kosmesis"] });
    expect(dlx("yarn", "yarn/4.1.0", "kosmesis", [])).toEqual({ command: "yarn", args: ["dlx", "kosmesis"] });
    expect(dlx("yarn", "yarn/1.22.0", "kosmesis", [])).toEqual({ command: "npx", args: ["--yes", "kosmesis"] });
    expect(dlx("npm", "", "kosmesis", [])).toEqual({ command: "npx", args: ["--yes", "kosmesis"] });
  });

  it("pins the kosmesis release whose init takes flags", () => {
    expect(KOSMESIS_RANGE).toBe("^0.6.0");
    expect(formatInvocation(kosmesisInvocation("pnpm", "", ["init"]))).toBe("pnpm dlx kosmesis@^0.6.0 init");
  });
});

describe("kosmesis init arguments", () => {
  it("never prompts and only names the style system when one was chosen", () => {
    expect(kosmesisInitArgs("praxisjs-css", ["--icon-library", "none"])).toEqual([
      "init",
      "--yes",
      "--style-system",
      "praxisjs-css",
      "--icon-library",
      "none",
    ]);
    expect(kosmesisInitArgs(undefined)).toEqual(["init", "--yes"]);
  });

  it("recognizes the two style systems", () => {
    expect(isKosmesisStyleSystem("tailwind")).toBe(true);
    expect(isKosmesisStyleSystem("praxisjs-css")).toBe(true);
    expect(isKosmesisStyleSystem("bootstrap")).toBe(false);
  });
});

describe("run", () => {
  it("collects stdout and stderr when piped", async () => {
    spawn.mockImplementationOnce(() => {
      const child = new EventEmitter() as FakeChild;
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      queueMicrotask(() => {
        child.stdout?.emit("data", Buffer.from("out "));
        child.stderr?.emit("data", Buffer.from("err"));
        child.emit("close", 2);
      });
      return child;
    });

    await expect(run({ command: "npx", args: ["x"] }, root, "pipe")).resolves.toEqual({ code: 2, output: "out err" });
    expect(spawn).toHaveBeenCalledWith("npx", ["x"], { cwd: root, shell: false, stdio: ["ignore", "pipe", "pipe"] });
  });

  it("hands the terminal over when inherited, and quotes caret ranges for cmd.exe on Windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    mockSpawn({ inherit: true });

    await run(kosmesisInvocation("npm", "", ["init"]), root, "inherit");

    expect(spawn).toHaveBeenCalledWith("npx", ["--yes", '"kosmesis@^0.6.0"', "init"], { cwd: root, shell: true, stdio: "inherit" });
  });

  it("resolves with the error when the command cannot start", async () => {
    const error = Object.assign(new Error("spawn pnpm ENOENT"), { code: "ENOENT" });
    mockSpawn({ error });
    await expect(run({ command: "pnpm", args: [] }, root, "pipe")).resolves.toEqual({ code: null, output: "", error });
  });
});

describe("describeFailure", () => {
  const invocation = { command: "pnpm", args: ["dlx", "kosmesis@^0.6.0", "init"] };

  it("explains a missing command", () => {
    const error = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    expect(describeFailure(invocation, { code: null, output: "", error })).toBe("`pnpm` was not found on your PATH.");
  });

  it("explains a command that could not start", () => {
    expect(describeFailure(invocation, { code: null, output: "", error: new Error("EACCES") })).toBe(
      "`pnpm dlx kosmesis@^0.6.0 init` could not start: EACCES",
    );
  });

  it("shows the exit code and the last lines of output", () => {
    const output = Array.from({ length: 10 }, (_, i) => `line ${String(i)}`).join("\n");
    const message = describeFailure(invocation, { code: 1, output });
    expect(message.split("\n")[0]).toBe("`pnpm dlx kosmesis@^0.6.0 init` exited with code 1.");
    expect(message).not.toContain("line 1\n");
    expect(message).toContain("line 2\nline 3");
    expect(describeFailure(invocation, { code: 1, output: " " })).toBe("`pnpm dlx kosmesis@^0.6.0 init` exited with code 1.");
  });
});

describe("setupKosmesis", () => {
  const writeConfig = () => {
    fs.writeFileSync(path.join(root, "components.json"), "{}");
  };

  it("runs init without prompts, then adds the components", async () => {
    mockSpawn({ effect: writeConfig }, {});

    const result = await setupKosmesis({
      root,
      packageManager: "pnpm",
      userAgent: "pnpm/10",
      styleSystem: "tailwind",
      components: ["button", "card"],
    });

    expect(result).toEqual({ ok: true, components: ["button", "card"] });
    expect(spawn.mock.calls.map((call) => [call[0], call[1]])).toEqual([
      ["pnpm", ["dlx", "kosmesis@^0.6.0", "init", "--yes", "--style-system", "tailwind"]],
      ["pnpm", ["dlx", "kosmesis@^0.6.0", "add", "button", "card"]],
    ]);
  });

  it("lets kosmesis init ask its own questions when interactive", async () => {
    mockSpawn({ effect: writeConfig, inherit: true });

    const result = await setupKosmesis({ root, packageManager: "npm", userAgent: "", interactive: true });

    expect(result).toEqual({ ok: true, components: [] });
    expect(spawn).toHaveBeenCalledOnce();
    expect(spawn.mock.calls[0]?.[1]).toEqual(["--yes", "kosmesis@^0.6.0", "init"]);
    expect(spawn.mock.calls[0]?.[2]).toMatchObject({ stdio: "inherit" });
  });

  it("returns every command to run later when init fails, e.g. before kosmesis 0.6 is published", async () => {
    mockSpawn({ code: 1, output: "ERR_PNPM_NO_MATCHING_VERSION No matching version found for kosmesis@^0.6.0" });

    const result = await setupKosmesis({
      root,
      packageManager: "pnpm",
      userAgent: "",
      styleSystem: "praxisjs-css",
      initFlags: ["--icon-library", "none"],
      components: ["button"],
    });

    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining("ERR_PNPM_NO_MATCHING_VERSION") as unknown,
      commands: [
        "pnpm dlx kosmesis@^0.6.0 init --yes --style-system praxisjs-css --icon-library none",
        "pnpm dlx kosmesis@^0.6.0 add button",
      ],
    });
    expect(spawn).toHaveBeenCalledOnce();
  });

  it("fails when init exits cleanly without writing components.json", async () => {
    mockSpawn({});
    const result = await setupKosmesis({ root, packageManager: "npm", userAgent: "" });
    expect(result).toEqual({
      ok: false,
      reason: "`kosmesis init` stopped before writing components.json.",
      commands: ["npx --yes kosmesis@^0.6.0 init --yes"],
    });
  });

  it("returns only the add command when adding the components fails", async () => {
    mockSpawn({ effect: writeConfig }, { code: 1, output: "Failed to fetch button" });
    const result = await setupKosmesis({ root, packageManager: "bun", userAgent: "", components: ["button"] });
    expect(result).toEqual({
      ok: false,
      reason: "`bunx kosmesis@^0.6.0 add button` exited with code 1.\nFailed to fetch button",
      commands: ["bunx kosmesis@^0.6.0 add button"],
    });
  });
});
