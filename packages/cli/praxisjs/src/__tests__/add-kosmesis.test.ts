import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  argv: ["node", "praxisjs", "add", "kosmesis"] as string[],
  cwd: "",
  env: {} as Record<string, string | undefined>,
  exit: vi.fn(),
  interactive: false,
  confirm: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), warn: vi.fn(), step: vi.fn() },
  spinner: { start: vi.fn(), stop: vi.fn() },
  setupKosmesis: vi.fn(),
  run: vi.fn(),
  installedIntegrations: vi.fn((): string[] => []),
  printAgentPrompt: vi.fn(),
}));

vi.mock("node:process", () => ({
  get argv() {
    return mocks.argv;
  },
  cwd: () => mocks.cwd,
  env: mocks.env,
  exit: mocks.exit,
}));
vi.mock("@clack/prompts", () => ({
  cancel: mocks.cancel,
  confirm: mocks.confirm,
  intro: vi.fn(),
  isCancel: (value: unknown) => typeof value === "symbol",
  log: mocks.log,
  note: mocks.note,
  outro: mocks.outro,
  spinner: () => mocks.spinner,
}));
vi.mock("picocolors", () => ({ default: new Proxy({}, { get: () => (s: string) => s }) }));
vi.mock("../kosmesis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../kosmesis")>()),
  setupKosmesis: mocks.setupKosmesis,
  run: mocks.run,
}));
vi.mock("../plugins", () => ({ installedIntegrations: mocks.installedIntegrations }));
vi.mock("../agent-prompts", () => ({ printAgentPrompt: mocks.printAgentPrompt }));
vi.mock("../commands/ai/sync", () => ({ isInteractive: () => mocks.interactive }));

const { addKosmesis, detectProject, parseAddKosmesisArgs } = await import("../commands/add/kosmesis");

function setArgs(...args: string[]): void {
  mocks.argv = ["node", "praxisjs", "add", "kosmesis", ...args];
}

function writeProject(deps: Record<string, string> = { "@praxisjs/core": "^2.0.0" }, devDeps: Record<string, string> = {}): void {
  fs.writeFileSync(path.join(mocks.cwd, "package.json"), JSON.stringify({ dependencies: deps, devDependencies: devDeps }));
  fs.mkdirSync(path.join(mocks.cwd, "node_modules"), { recursive: true });
}

function notes(): Record<string, string> {
  return Object.fromEntries(mocks.note.mock.calls.map((call) => [String(call[1]), String(call[0])]));
}

beforeEach(() => {
  mocks.cwd = fs.mkdtempSync(path.join(os.tmpdir(), "praxisjs-add-kosmesis-"));
  for (const key of Object.keys(mocks.env)) Reflect.deleteProperty(mocks.env, key);
  mocks.interactive = false;
  setArgs();
  mocks.setupKosmesis.mockResolvedValue({ ok: true, components: [] });
  mocks.run.mockResolvedValue({ code: 0, output: "" });
  mocks.installedIntegrations.mockReturnValue([]);
});

afterEach(() => {
  fs.rmSync(mocks.cwd, { recursive: true, force: true });
  vi.clearAllMocks();
});

describe("parseAddKosmesisArgs", () => {
  it("reads the style system, the components and the init flags to pass through", () => {
    expect(
      parseAddKosmesisArgs([
        "--style-system=praxisjs-css",
        "--components",
        "button, card,",
        "--icon-library",
        "none",
        "--css=src/theme.ts",
        "--erase",
        "--force",
        "-y",
      ]),
    ).toEqual({
      styleSystem: "praxisjs-css",
      components: ["button", "card"],
      initFlags: ["--icon-library", "none", "--css", "src/theme.ts", "--erase", "--force"],
      flags: true,
      help: false,
    });
    expect(parseAddKosmesisArgs([])).toEqual({ initFlags: [], flags: false, help: false });
    expect(parseAddKosmesisArgs(["--help"]).help).toBe(true);
  });

  it.each([
    [["--style-system", "bootstrap"], 'Invalid value "bootstrap" for --style-system.'],
    [["--components"], "Missing value for --components."],
    [["--css", "--yes"], "Missing value for --css."],
    [["--root-component="], "Missing value for --root-component."],
    [["--tauri"], 'Unknown option "--tauri".'],
    [["button"], 'Unknown option "button".'],
  ])("rejects %j", (args, message) => {
    expect(() => parseAddKosmesisArgs(args)).toThrow(message);
  });
});

describe("detectProject", () => {
  it("guesses the closest create-praxisjs template and spots Tauri", () => {
    const root = mocks.cwd;
    expect(detectProject(root, { dependencies: { "@praxisjs/core": "1" } })).toEqual({ template: "minimal", tauri: false, ai: false });
    expect(detectProject(root, { dependencies: { "@praxisjs/router": "1" } }).template).toBe("router");
    expect(detectProject(root, { dependencies: { "@praxisjs/store": "1", "@praxisjs/di": "1" } }).template).toBe("full");
    expect(detectProject(root, { dependencies: { "@praxisjs/content": "1" } }).template).toBe("blog");
    expect(detectProject(root, { devDependencies: { "@tauri-apps/api": "2" } }).tauri).toBe(true);
    fs.mkdirSync(path.join(root, "src-tauri"));
    fs.writeFileSync(path.join(root, "src-tauri", "tauri.conf.json"), "{}");
    mocks.installedIntegrations.mockReturnValueOnce(["claude-skill"]);
    expect(detectProject(root, {})).toEqual({ template: "minimal", tauri: true, ai: true });
  });
});

describe("praxisjs add kosmesis", () => {
  it("runs kosmesis init without prompts when flags are given, and shows how to add components", async () => {
    mocks.env.npm_config_user_agent = "pnpm/10.0.0";
    writeProject({ "@praxisjs/core": "^2.0.0", "@praxisjs/router": "^1.0.0" });
    setArgs("--yes", "--style-system", "praxisjs-css", "--icon-library", "none");

    await addKosmesis();

    expect(mocks.log.info).toHaveBeenCalledWith("Project: router template, pnpm");
    expect(mocks.setupKosmesis).toHaveBeenCalledWith({
      root: mocks.cwd,
      packageManager: "pnpm",
      userAgent: "pnpm/10.0.0",
      styleSystem: "praxisjs-css",
      initFlags: ["--icon-library", "none"],
      components: [],
      interactive: false,
    });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(notes()["Next steps"]).toContain("Add a component: pnpm dlx kosmesis add button");
    expect(notes()["Next steps"]).toContain("Run it: pnpm run dev");
    expect(mocks.spinner.stop).toHaveBeenCalledWith("Kosmesis is set up.");
    expect(mocks.printAgentPrompt).not.toHaveBeenCalled();
  });

  it("shows the import of the first component added, and the Tauri dev command in a Tauri project", async () => {
    writeProject({ "@praxisjs/core": "^2.0.0", "@tauri-apps/api": "^2.0.0" });
    fs.writeFileSync(path.join(mocks.cwd, "yarn.lock"), "");
    setArgs("--components=alert-dialog,button");
    mocks.setupKosmesis.mockResolvedValue({ ok: true, components: ["alert-dialog", "button"] });

    await addKosmesis();

    expect(mocks.log.info).toHaveBeenCalledWith("Project: minimal template + Tauri v2, yarn");
    expect(notes()["Next steps"]).toContain('Use it: import { AlertDialog } from "@/components/ui/alert-dialog";');
    expect(notes()["Next steps"]).toContain("Add more: yarn dlx kosmesis add <component>");
    expect(notes()["Next steps"]).toContain("Run it: yarn tauri:dev");
  });

  it("lets kosmesis init prompt in a terminal without flags, after asking about starter components", async () => {
    mocks.interactive = true;
    writeProject();
    mocks.confirm.mockResolvedValue(true);

    await addKosmesis();

    expect(mocks.confirm).toHaveBeenCalledWith({ message: "Add starter components (button, card) after the setup?", initialValue: true });
    expect(mocks.log.step).toHaveBeenCalledWith("Running kosmesis init");
    expect(mocks.spinner.start).not.toHaveBeenCalled();
    expect(mocks.setupKosmesis).toHaveBeenCalledWith(expect.objectContaining({ interactive: true, components: ["button", "card"] }));

    mocks.confirm.mockResolvedValue(false);
    await addKosmesis();
    expect(mocks.setupKosmesis).toHaveBeenLastCalledWith(expect.objectContaining({ components: [] }));
  });

  it("stops when the starter components question is cancelled", async () => {
    mocks.interactive = true;
    writeProject();
    mocks.confirm.mockResolvedValue(Symbol("cancel"));

    await addKosmesis();

    expect(mocks.cancel).toHaveBeenCalledWith("Operation cancelled");
    expect(mocks.setupKosmesis).not.toHaveBeenCalled();
  });

  it("prints the map prompt for each installed AI integration", async () => {
    writeProject();
    mocks.installedIntegrations.mockReturnValue(["claude-skill", "codex-skill"]);
    setArgs("--yes");

    await addKosmesis();

    expect(mocks.printAgentPrompt.mock.calls).toEqual([
      ["claude-skill", "map"],
      ["codex-skill", "map"],
    ]);
    expect(mocks.outro.mock.invocationCallOrder[0]).toBeLessThan(mocks.printAgentPrompt.mock.invocationCallOrder[0] ?? 0);
  });

  it("installs the project's dependencies first when node_modules is missing", async () => {
    writeProject();
    fs.rmSync(path.join(mocks.cwd, "node_modules"), { recursive: true });
    fs.writeFileSync(path.join(mocks.cwd, "pnpm-lock.yaml"), "");
    setArgs("--yes");

    await addKosmesis();

    expect(mocks.run).toHaveBeenCalledWith({ command: "pnpm", args: ["install"] }, mocks.cwd, "pipe");
    expect(mocks.setupKosmesis).toHaveBeenCalled();

    fs.rmSync(path.join(mocks.cwd, "pnpm-lock.yaml"));
    fs.writeFileSync(path.join(mocks.cwd, "yarn.lock"), "");
    await addKosmesis();
    expect(mocks.run).toHaveBeenLastCalledWith({ command: "yarn", args: [] }, mocks.cwd, "pipe");
  });

  it("exits with code 1 when that install fails", async () => {
    writeProject();
    fs.rmSync(path.join(mocks.cwd, "node_modules"), { recursive: true });
    mocks.run.mockResolvedValue({ code: 1, output: "ERESOLVE" });
    setArgs("--yes");

    await addKosmesis();

    expect(mocks.cancel).toHaveBeenCalledWith("`npm install` exited with code 1.\nERESOLVE");
    expect(mocks.exit).toHaveBeenCalledWith(1);
    expect(mocks.setupKosmesis).not.toHaveBeenCalled();
  });

  it("prints the commands to finish by hand and exits with code 1 when the setup fails", async () => {
    writeProject();
    setArgs("--yes");
    mocks.setupKosmesis.mockResolvedValue({ ok: false, reason: "no matching version", commands: ["npx --yes kosmesis@^0.6.0 init --yes"] });

    await addKosmesis();

    expect(mocks.spinner.stop).toHaveBeenCalledWith("Kosmesis was not set up.");
    expect(mocks.log.warn).toHaveBeenCalledWith("no matching version");
    expect(notes()["Run this in the project to finish"]).toBe("npx --yes kosmesis@^0.6.0 init --yes");
    expect(mocks.exit).toHaveBeenCalledWith(1);

    mocks.interactive = true;
    setArgs();
    mocks.confirm.mockResolvedValue(false);
    mocks.spinner.stop.mockClear();
    await addKosmesis();
    expect(mocks.spinner.stop).not.toHaveBeenCalled();
  });

  it("does nothing when Kosmesis is already set up", async () => {
    writeProject();
    fs.writeFileSync(path.join(mocks.cwd, "components.json"), JSON.stringify({ styleSystem: "tailwind" }));

    await addKosmesis();

    expect(notes().Kosmesis).toContain("Kosmesis is already set up here (tailwind).");
    expect(notes().Kosmesis).toContain("npx --yes kosmesis add <component>");
    expect(mocks.outro).toHaveBeenCalledWith("Nothing to do.");
    expect(mocks.setupKosmesis).not.toHaveBeenCalled();

    fs.writeFileSync(path.join(mocks.cwd, "components.json"), "{}");
    await addKosmesis();
    expect(notes().Kosmesis).toContain("(unknown style system)");
  });

  it("refuses to run outside a PraxisJS project", async () => {
    await addKosmesis();
    expect(mocks.cancel).toHaveBeenCalledWith(expect.stringContaining("No PraxisJS project here"));
    expect(mocks.exit).toHaveBeenCalledWith(1);

    writeProject({ react: "^19.0.0" });
    await addKosmesis();
    expect(mocks.exit).toHaveBeenCalledTimes(2);
    expect(mocks.setupKosmesis).not.toHaveBeenCalled();
  });

  it("prints the usage on --help, and with the error on a bad flag", async () => {
    setArgs("--help");
    await addKosmesis();
    expect(mocks.note).toHaveBeenCalledWith(expect.stringContaining("Usage: praxisjs add kosmesis"), "praxisjs add kosmesis");

    setArgs("--style-system");
    await addKosmesis();
    expect(mocks.cancel).toHaveBeenCalledWith(expect.stringMatching(/^Missing value for --style-system\.\n\nUsage: praxisjs add kosmesis/));
    expect(mocks.exit).toHaveBeenCalledWith(1);
  });
});
