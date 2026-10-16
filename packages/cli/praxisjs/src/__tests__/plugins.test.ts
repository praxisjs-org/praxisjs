import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNote = vi.fn();

vi.mock("@clack/prompts", () => ({ note: mockNote }));
vi.mock("picocolors", () => ({
  default: new Proxy({}, { get: () => (s: string) => s }),
}));

const {
  applyPlugin,
  applySync,
  desiredFiles,
  hashContent,
  hasPendingChanges,
  installedIntegrations,
  LOCK_FILE,
  MCP_SERVER,
  notePlugin,
  noteRemovedPlugin,
  planSync,
  readLock,
  removePlugin,
  sharedSkillNames,
} = await import("../plugins");

let root: string;

const read = (file: string) => fs.readFileSync(path.join(root, file), "utf-8");
const readJson = (file: string) => JSON.parse(read(file)) as Record<string, unknown>;
const exists = (file: string) => fs.existsSync(path.join(root, file));
const write = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "praxisjs-plugin-"));
  mockNote.mockClear();
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

const DX_SKILLS = [
  "praxisjs-ai-setup",
  "praxisjs-component",
  "praxisjs-composable",
  "praxisjs-decorator",
  "praxisjs-memory",
  "praxisjs-memory-bootstrap",
  "praxisjs-performance",
  "praxisjs-store",
  "praxisjs-testing",
  "praxisjs-ui",
  "praxisjs-upgrade",
];

describe("sharedSkillNames", () => {
  it("lists the DX skills shipped with every integration", () => {
    expect(sharedSkillNames()).toEqual(DX_SKILLS);
  });
});

describe("applyPlugin — claude-skill", () => {
  it("installs the main skill with the shared references, and the DX skills", () => {
    expect(applyPlugin("claude-skill", root)).toEqual([]);

    expect(exists(".claude/skills/praxisjs/SKILL.md")).toBe(true);
    expect(exists(".claude/skills/praxisjs/references/claude-md.md")).toBe(true);
    for (const reference of ["mcp.md", "project-memory.md", "project-structure.md", "extending.md"]) {
      expect(exists(`.claude/skills/praxisjs/references/${reference}`)).toBe(true);
    }
    for (const skill of DX_SKILLS) expect(exists(`.claude/skills/${skill}/SKILL.md`)).toBe(true);
  });

  it("registers the MCP server in .mcp.json and approves it in .claude/settings.json", () => {
    applyPlugin("claude-skill", root);

    expect(readJson(".mcp.json")).toEqual({ mcpServers: { praxisjs: MCP_SERVER } });
    expect(readJson(".claude/settings.json")).toEqual({ enabledMcpjsonServers: ["praxisjs"] });
    expect(read(".mcp.json").endsWith("}\n")).toBe(true);
  });

  it("merges with existing configs and moves a legacy server out of settings.json", () => {
    write(".mcp.json", JSON.stringify({ mcpServers: { other: { command: "x" } }, extra: 1 }));
    write(
      ".claude/settings.json",
      JSON.stringify({
        permissions: { allow: ["Bash(ls)"] },
        mcpServers: { praxisjs: { command: "old" } },
        enabledMcpjsonServers: ["other", "praxisjs", 3],
      }),
    );

    applyPlugin("claude-skill", root);
    applyPlugin("claude-skill", root);

    expect(readJson(".mcp.json")).toEqual({ mcpServers: { other: { command: "x" }, praxisjs: MCP_SERVER }, extra: 1 });
    expect(readJson(".claude/settings.json")).toEqual({
      permissions: { allow: ["Bash(ls)"] },
      enabledMcpjsonServers: ["other", "praxisjs"],
    });
  });

  it("keeps a local server command and its env, and updates an outdated one", () => {
    write(".mcp.json", JSON.stringify({ mcpServers: { praxisjs: { command: "./node_modules/.bin/praxisjs-mcp", env: { A: "1" } } } }));
    applyPlugin("claude-skill", root);
    expect(readJson(".mcp.json")).toEqual({ mcpServers: { praxisjs: { command: "./node_modules/.bin/praxisjs-mcp", env: { A: "1" } } } });

    write(".mcp.json", JSON.stringify({ mcpServers: { praxisjs: { command: "npx", args: ["@praxisjs/mcp@0.1.0"], env: { A: "1" } } } }));
    applyPlugin("claude-skill", root);
    expect(readJson(".mcp.json")).toEqual({ mcpServers: { praxisjs: { ...MCP_SERVER, env: { A: "1" } } } });
  });

  it("keeps unrelated servers left in settings.json and replaces a malformed mcpServers", () => {
    write(".mcp.json", JSON.stringify({ mcpServers: [] }));
    write(".claude/settings.json", JSON.stringify({ mcpServers: { mine: {} } }));

    applyPlugin("claude-skill", root);

    expect(readJson(".mcp.json")).toEqual({ mcpServers: { praxisjs: MCP_SERVER } });
    expect(readJson(".claude/settings.json")).toEqual({ mcpServers: { mine: {} }, enabledMcpjsonServers: ["praxisjs"] });
  });

  it("warns instead of overwriting configs it cannot read", () => {
    write(".mcp.json", "{ not json");
    write(".claude/settings.json", "[]");

    const warnings = applyPlugin("claude-skill", root);

    expect(warnings).toEqual([
      ".mcp.json is not valid JSON: left it unchanged, add the praxisjs MCP server to it by hand.",
      ".claude/settings.json is not a JSON object: left it unchanged, add the praxisjs MCP server to it by hand.",
    ]);
    expect(read(".mcp.json")).toBe("{ not json");
  });
});

describe("applyPlugin — codex-skill", () => {
  it("installs the skills, AGENTS.md and the project MCP config", () => {
    expect(applyPlugin("codex-skill", root)).toEqual([]);

    expect(exists(".agents/skills/praxisjs/SKILL.md")).toBe(true);
    expect(exists(".agents/skills/praxisjs/references/agents-md.md")).toBe(true);
    expect(exists(".agents/skills/praxisjs/references/mcp.md")).toBe(true);
    for (const skill of DX_SKILLS) expect(exists(`.agents/skills/${skill}/SKILL.md`)).toBe(true);
    expect(read("AGENTS.md")).toContain("## Working agreements");
    expect(read(".codex/config.toml")).toBe('[mcp_servers.praxisjs]\ncommand = "npx"\nargs = ["-y", "@praxisjs/mcp"]\n');
  });

  it("keeps an existing AGENTS.md and appends to an existing config once", () => {
    write("AGENTS.md", "# Mine");
    write(".codex/config.toml", 'model = "o4"\n\n[mcp_servers.other]\ncommand = "x"\n');

    applyPlugin("codex-skill", root);
    applyPlugin("codex-skill", root);

    expect(read("AGENTS.md")).toBe("# Mine");
    expect(read(".codex/config.toml")).toBe(
      'model = "o4"\n\n[mcp_servers.other]\ncommand = "x"\n\n[mcp_servers.praxisjs]\ncommand = "npx"\nargs = ["-y", "@praxisjs/mcp"]\n',
    );
  });

  it("rewrites an outdated praxisjs table in place", () => {
    write(".codex/config.toml", '[mcp_servers.praxisjs]\ncommand = "node"\nargs = ["old.js"]\n\n[other]\nx = 1\n');
    applyPlugin("codex-skill", root);
    expect(read(".codex/config.toml")).toBe('[other]\nx = 1\n\n[mcp_servers.praxisjs]\ncommand = "npx"\nargs = ["-y", "@praxisjs/mcp"]\n');
  });

  it("writes the server into an empty config file", () => {
    write(".codex/config.toml", "\n");
    applyPlugin("codex-skill", root);
    expect(read(".codex/config.toml").startsWith("[mcp_servers.praxisjs]")).toBe(true);
  });
});

describe("sync — install lock, legacy installs and local edits", () => {
  it("records every installed file in the lock and is idempotent", () => {
    applyPlugin("claude-skill", root);
    const lock = readLock(root);
    const files = desiredFiles("claude-skill");
    expect(Object.keys(lock.integrations["claude-skill"]?.files ?? {}).sort()).toEqual([...files.keys()].sort());
    expect(lock.integrations["claude-skill"]?.version).toMatch(/^\d+\.\d+\.\d+/);
    const plan = planSync("claude-skill", root);
    expect(hasPendingChanges(plan)).toBe(false);
    expect(plan.files.every((f) => f.action === "unchanged")).toBe(true);
    expect(plan.legacy).toBe(false);
    const before = read(LOCK_FILE);
    applyPlugin("claude-skill", root);
    expect(read(LOCK_FILE)).toBe(before);
  });

  it("updates files an older release installed unedited, and removes the ones no longer shipped", () => {
    const legacy = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../plugins/legacy-files.json"), "utf-8")) as {
      files: Record<string, string[]>;
    };
    expect(Object.keys(legacy.files)).toContain(".claude/skills/praxisjs/SKILL.md");
    write(".claude/skills/praxisjs/SKILL.md", "old");
    write(".claude/skills/praxisjs/references/project-config.md", "old config");
    const oldHash = hashContent("old");
    const lock = { lockVersion: 1, integrations: { "claude-skill": { version: "1.0.0", files: { ".claude/skills/praxisjs/SKILL.md": oldHash, ".claude/skills/praxisjs/references/gone.md": hashContent("gone") } } } };
    write(LOCK_FILE, JSON.stringify(lock));
    write(".claude/skills/praxisjs/references/gone.md", "gone");

    const plan = planSync("claude-skill", root);
    const action = (file: string) => plan.files.find((f) => f.path === file)?.action;
    expect(action(".claude/skills/praxisjs/SKILL.md")).toBe("update");
    expect(action(".claude/skills/praxisjs/references/project-config.md")).toBe("edited");
    expect(action(".claude/skills/praxisjs/references/gone.md")).toBe("remove");
    expect(action(".claude/skills/praxisjs-memory/SKILL.md")).toBe("create");

    const result = applySync(plan, root);
    expect(result.removed).toEqual([".claude/skills/praxisjs/references/gone.md"]);
    expect(result.kept).toEqual([".claude/skills/praxisjs/references/project-config.md"]);
    expect(read(".claude/skills/praxisjs/references/project-config.md")).toBe("old config");
    expect(read(".claude/skills/praxisjs/SKILL.md")).toBe(desiredFiles("claude-skill").get(".claude/skills/praxisjs/SKILL.md")?.content);

    const again = planSync("claude-skill", root);
    expect(again.files.find((f) => f.path === ".claude/skills/praxisjs/references/project-config.md")?.action).toBe("edited");
    expect(hasPendingChanges(again)).toBe(false);
  });

  it("recognizes a pre-lock install by the hashes of earlier releases", () => {
    const legacy = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../plugins/legacy-files.json"), "utf-8")) as {
      files: Record<string, string[]>;
    };
    const known = legacy.files[".agents/skills/praxisjs/SKILL.md"][0];
    expect(known).toMatch(/^sha256-/);
    write(".agents/skills/praxisjs/SKILL.md", "mine");
    const plan = planSync("codex-skill", root);
    expect(plan.legacy).toBe(true);
    expect(plan.files.find((f) => f.path === ".agents/skills/praxisjs/SKILL.md")?.action).toBe("edited");
    expect(installedIntegrations(root)).toEqual(["codex-skill"]);
  });

  it("replaces or deletes edited files only when approved, and cleans up emptied folders", () => {
    applyPlugin("claude-skill", root);
    write(".claude/skills/praxisjs/SKILL.md", "my edit");
    const lock = readLock(root);
    const entry = lock.integrations["claude-skill"];
    if (!entry) throw new Error("no lock entry");
    entry.files[".claude/skills/praxisjs-old/SKILL.md"] = hashContent("x");
    write(LOCK_FILE, JSON.stringify(lock));
    write(".claude/skills/praxisjs-old/SKILL.md", "edited old");

    const plan = planSync("claude-skill", root);
    expect(plan.files.find((f) => f.path === ".claude/skills/praxisjs-old/SKILL.md")?.action).toBe("remove-edited");
    const result = applySync(plan, root, new Set([".claude/skills/praxisjs/SKILL.md", ".claude/skills/praxisjs-old/SKILL.md"]));
    expect(result.written).toContain(".claude/skills/praxisjs/SKILL.md");
    expect(result.removed).toEqual([".claude/skills/praxisjs-old/SKILL.md"]);
    expect(exists(".claude/skills/praxisjs-old")).toBe(false);
    expect(read(".claude/skills/praxisjs/SKILL.md")).not.toBe("my edit");
  });

  it("keeps a declined edited file and warns about it", () => {
    applyPlugin("claude-skill", root);
    write(".claude/skills/praxisjs/SKILL.md", "my edit");
    const entry = readLock(root).integrations["claude-skill"];
    write(LOCK_FILE, JSON.stringify({ lockVersion: 1, integrations: { "claude-skill": { ...entry, files: { ...entry?.files, ".claude/skills/old/SKILL.md": "sha256-x" } } } }));
    write(".claude/skills/old/SKILL.md", "edited");

    expect(applyPlugin("claude-skill", root)).toEqual([
      ".claude/skills/praxisjs/SKILL.md has local edits: kept it. Run `praxisjs ai sync` to review it.",
      ".claude/skills/old/SKILL.md has local edits: kept it. Run `praxisjs ai sync` to review it.",
    ]);
    expect(read(".claude/skills/praxisjs/SKILL.md")).toBe("my edit");
    expect(read(".claude/skills/old/SKILL.md")).toBe("edited");
  });

  it("treats a shipped path that is a file as that file", () => {
    const realStat = fs.statSync;
    const spyStat = vi.spyOn(fs, "statSync").mockImplementation(((file: fs.PathLike, options?: fs.StatSyncOptions) =>
      String(file).endsWith(`dot-agents${path.sep}skills${path.sep}praxisjs`) ? { isDirectory: () => false } : realStat(file, options)) as typeof fs.statSync);
    const realRead = fs.readFileSync;
    const spyRead = vi.spyOn(fs, "readFileSync").mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) =>
      String(file).endsWith(`dot-agents${path.sep}skills${path.sep}praxisjs`) ? "file" : realRead(file, options as BufferEncoding)) as typeof fs.readFileSync);
    expect(desiredFiles("codex-skill").get(".agents/skills/praxisjs/praxisjs")?.content).toBe("file");
    spyStat.mockRestore();
    spyRead.mockRestore();
  });

  it("falls back when the package files are unreadable", () => {
    const realRead = fs.readFileSync;
    const realExists = fs.existsSync;
    const spyRead = vi.spyOn(fs, "readFileSync").mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => {
      const name = String(file);
      if (name.endsWith(`praxisjs${path.sep}package.json`)) return "{}";
      if (name.endsWith("legacy-files.json")) return "{}";
      return realRead(file, options as BufferEncoding);
    }) as typeof fs.readFileSync);
    applyPlugin("codex-skill", root);
    expect(readLock(root).integrations["codex-skill"]?.version).toBe("0.0.0");
    spyRead.mockImplementation(((file: fs.PathOrFileDescriptor, options?: unknown) => {
      if (String(file).endsWith("legacy-files.json")) throw new Error("gone");
      return realRead(file, options as BufferEncoding);
    }) as typeof fs.readFileSync);
    expect(planSync("codex-skill", root).files.length).toBeGreaterThan(0);
    spyRead.mockRestore();

    const spyExists = vi.spyOn(fs, "existsSync").mockImplementation((file) => !String(file).includes(`plugins${path.sep}shared`) && realExists(file));
    expect(sharedSkillNames()).toEqual([]);
    spyExists.mockRestore();
    const realStat = fs.statSync;
    const spyStat = vi.spyOn(fs, "statSync").mockImplementation(((file: fs.PathLike, options?: fs.StatSyncOptions) =>
      String(file).includes(`plugins${path.sep}shared`) ? undefined : realStat(file, options)) as typeof fs.statSync);
    expect([...desiredFiles("codex-skill").keys()].every((f) => !f.includes("praxisjs-"))).toBe(true);
    spyStat.mockRestore();
  });

  it("ignores lock entries for files already gone, and an unreadable lock", () => {
    write(LOCK_FILE, "{ broken");
    expect(readLock(root)).toEqual({ lockVersion: 1, integrations: {} });
    write(LOCK_FILE, JSON.stringify({ integrations: { "claude-skill": { version: "1.0.0", files: { ".claude/skills/x/SKILL.md": "sha256-a" } } } }));
    expect(installedIntegrations(root)).toEqual(["claude-skill"]);
    expect(planSync("claude-skill", root).files.some((f) => f.path.includes("/x/"))).toBe(false);
    write(LOCK_FILE, JSON.stringify({ integrations: [] }));
    expect(readLock(root).integrations).toEqual({});
  });

  it("drops an integration from the lock on remove, and the lock file with the last one", () => {
    applyPlugin("claude-skill", root);
    applyPlugin("codex-skill", root);
    removePlugin("claude-skill", root);
    expect(Object.keys(readLock(root).integrations)).toEqual(["codex-skill"]);
    removePlugin("codex-skill", root);
    expect(exists(LOCK_FILE)).toBe(false);
  });
});

describe("applyPlugin / removePlugin — none", () => {
  it("does nothing", () => {
    expect(applyPlugin("none", root)).toEqual([]);
    expect(removePlugin("none", root)).toEqual([]);
    expect(fs.readdirSync(root)).toEqual([]);
  });
});

describe("removePlugin — claude-skill", () => {
  it("removes the skills and the server, keeping everything else", () => {
    write(".claude/skills/my-own/SKILL.md", "");
    write(".mcp.json", JSON.stringify({ mcpServers: { other: {} } }));
    write(".claude/settings.json", JSON.stringify({ enabledMcpjsonServers: ["other"] }));
    applyPlugin("claude-skill", root);

    expect(removePlugin("claude-skill", root)).toEqual([]);

    expect(fs.readdirSync(path.join(root, ".claude/skills"))).toEqual(["my-own"]);
    expect(readJson(".mcp.json")).toEqual({ mcpServers: { other: {} } });
    expect(readJson(".claude/settings.json")).toEqual({ enabledMcpjsonServers: ["other"] });
  });

  it("deletes config files left empty", () => {
    applyPlugin("claude-skill", root);
    removePlugin("claude-skill", root);

    expect(exists(".mcp.json")).toBe(false);
    expect(exists(".claude/settings.json")).toBe(false);
    expect(exists(".claude/skills/praxisjs")).toBe(false);
  });

  it("works when the configs are missing, or warns when unreadable", () => {
    expect(removePlugin("claude-skill", root)).toEqual([]);
    write(".mcp.json", "oops");
    write(".claude/settings.json", JSON.stringify({ mcpServers: "x" }));
    expect(removePlugin("claude-skill", root)).toHaveLength(1);
    expect(readJson(".claude/settings.json")).toEqual({ mcpServers: "x" });
  });
});

describe("removePlugin — codex-skill", () => {
  it("removes the skills and the praxisjs tables from the config", () => {
    write(".codex/config.toml", 'model = "o4"\n\n[mcp_servers.praxisjs]\ncommand = "old"\n\n[mcp_servers.praxisjs.env]\nA = "1"\n\n[mcp_servers.other]\ncommand = "x"\n');
    applyPlugin("codex-skill", root);

    removePlugin("codex-skill", root);

    expect(exists(".agents/skills/praxisjs")).toBe(false);
    expect(exists("AGENTS.md")).toBe(true);
    expect(read(".codex/config.toml")).toBe('model = "o4"\n\n[mcp_servers.other]\ncommand = "x"\n');
  });

  it("deletes a config that only held the server, and skips a missing one", () => {
    applyPlugin("codex-skill", root);
    removePlugin("codex-skill", root);
    expect(exists(".codex/config.toml")).toBe(false);
    expect(removePlugin("codex-skill", root)).toEqual([]);
  });
});

describe("notes", () => {
  it("describes what was installed", () => {
    notePlugin("claude-skill");
    notePlugin("codex-skill");
    notePlugin("none");

    expect(mockNote.mock.calls.map((c) => c[1])).toEqual(["Claude Code", "Codex"]);
    expect(mockNote.mock.calls[0][0]).toContain(".mcp.json");
    expect(mockNote.mock.calls[1][0]).toContain(".codex/config.toml");
  });

  it("describes what was removed", () => {
    noteRemovedPlugin("claude-skill");
    noteRemovedPlugin("codex-skill");
    noteRemovedPlugin("none");

    expect(mockNote.mock.calls.map((c) => c[1])).toEqual(["Claude Code", "Codex"]);
    expect(mockNote.mock.calls[0][0]).toContain(".praxis/");
  });
});
