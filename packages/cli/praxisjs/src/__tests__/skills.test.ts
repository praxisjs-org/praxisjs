import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TOOL_DEFINITIONS } from "../../../../dx/mcp/src/tool-definitions";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docsRoot = path.resolve(pkgRoot, "../../../docs/content/docs");
const plugins = path.join(pkgRoot, "plugins");

const CLAUDE_DIR = path.join(plugins, "claude-skill/skills/praxisjs");
const CODEX_DIR = path.join(plugins, "codex-skill/dot-agents/skills/praxisjs");
const SHARED_SKILLS = path.join(plugins, "shared/skills");
const SHARED_REFERENCES = path.join(plugins, "shared/references");

const SKILLS = {
  claude: path.join(CLAUDE_DIR, "SKILL.md"),
  codex: path.join(CODEX_DIR, "SKILL.md"),
};

const read = (file: string) => fs.readFileSync(file, "utf-8");

/** The Codex variant is the Claude one with the agent's names swapped. */
function toCodex(text: string): string {
  return text
    .replaceAll("claude-md.md", "agents-md.md")
    .replaceAll("Claude Code", "Codex")
    .replaceAll("CLAUDE.md", "AGENTS.md")
    .replaceAll("Claude", "Codex");
}

/** Slugs from the "| Topic | Slug |" table. */
function slugTable(file: string): string[] {
  const text = read(file);
  const start = text.indexOf("| Topic | Slug |");
  const rows = text.slice(start).split("\n\n")[0].split("\n").slice(2);
  return rows.flatMap((row) => {
    const slugCell = row.split("|").at(-2) ?? "";
    return [...slugCell.matchAll(/`([a-z][a-z/-]*)`/g)].map((m) => m[1]);
  });
}

/** Every docs page as a slug. */
function docsPages(dir = docsRoot, prefix = ""): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return docsPages(path.join(dir, entry.name), `${prefix}${entry.name}/`);
    if (!entry.name.endsWith(".mdx")) return [];
    const name = entry.name.slice(0, -4);
    return [name === "index" ? prefix.slice(0, -1) : `${prefix}${name}`];
  });
}

const pages = new Set(docsPages());
const listedPages = [...pages].filter((page) => !page.startsWith("changelog"));
// Section landing pages only link to their children, which are listed themselves.
const sectionIndexes = new Set(["", "advanced", "ecosystem", "essentials", "guide", "internal", "tooling"]);

/** Every Markdown file an installed skill set contains, as [installed path, source file]. */
function installedFiles(variantDir: string): Array<[string, string]> {
  const walk = (dir: string, prefix: string): Array<[string, string]> =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry): Array<[string, string]> => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full, `${prefix}${entry.name}/`) : [[`${prefix}${entry.name}`, full]];
    });
  return [
    ...walk(variantDir, "praxisjs/"),
    ...walk(SHARED_REFERENCES, "praxisjs/references/"),
    ...walk(SHARED_SKILLS, ""),
  ];
}

describe.each(Object.entries(SKILLS))("%s SKILL.md", (_, file) => {
  const slugs = slugTable(file);

  it("only lists slugs that exist in the docs", () => {
    expect(slugs.filter((slug) => !pages.has(slug))).toEqual([]);
  });

  it("lists every docs page", () => {
    const listed = new Set(slugs);
    expect(listedPages.filter((page) => !listed.has(page) && !sectionIndexes.has(page))).toEqual([]);
  });
});

describe("Claude Code and Codex variants", () => {
  it("say the same thing, with the agent's names swapped", () => {
    expect(read(SKILLS.codex)).toBe(toCodex(read(SKILLS.claude)));
    expect(read(path.join(CODEX_DIR, "references/agents-md.md"))).toBe(toCodex(read(path.join(CLAUDE_DIR, "references/claude-md.md"))));
    expect(read(path.join(CODEX_DIR, "references/project-config.md"))).toBe(
      toCodex(read(path.join(CLAUDE_DIR, "references/project-config.md"))),
    );
  });

  it("have the same reference files", () => {
    const names = (dir: string) => fs.readdirSync(path.join(dir, "references")).map((n) => n.replace("claude-md", "agents-md")).sort();
    expect(names(CODEX_DIR)).toEqual(names(CLAUDE_DIR));
  });
});

describe.each([
  ["claude", CLAUDE_DIR],
  ["codex", CODEX_DIR],
])("installed %s skills", (_, variantDir) => {
  const files = installedFiles(variantDir);
  const skills = files.filter(([installed]) => installed.endsWith("/SKILL.md"));

  it("ship the main skill and every DX skill", () => {
    expect(skills.map(([installed]) => installed.split("/")[0]).sort()).toEqual(
      ["praxisjs", ...fs.readdirSync(SHARED_SKILLS)].sort(),
    );
  });

  it.each(skills.map(([installed, source]) => [installed, source]))("%s has valid frontmatter", (installed, source) => {
    const text = read(source);
    const match = /^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n---\n/.exec(text);
    expect(match, "frontmatter with name and description").not.toBeNull();
    const [, name, description] = match ?? [];
    expect(name).toBe(installed.split("/")[0]);
    expect(name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(description.length).toBeGreaterThan(50);
    expect(description.length).toBeLessThanOrEqual(1024);
  });

  it("only link to files that exist once installed", () => {
    const installedPaths = new Set(files.map(([installed]) => installed));
    const broken: string[] = [];
    for (const [installed, source] of files) {
      if (!installed.endsWith(".md")) continue;
      for (const m of read(source).matchAll(/`((?:\.\.\/praxisjs\/)?references\/[\w-]+\.md)`/g)) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(installed), m[1]));
        const resolved = m[1].startsWith("references/") && installed.includes("/references/")
          ? path.posix.join(path.posix.dirname(path.posix.dirname(installed)), m[1])
          : target;
        if (!installedPaths.has(resolved)) broken.push(`${installed} → ${m[1]}`);
      }
      for (const m of read(source).matchAll(/`([\w-]+\.md)`/g)) {
        if (["SKILL.md", "CLAUDE.md", "AGENTS.md", "README.md", "index.md"].includes(m[1])) continue;
        if (!installedPaths.has(`praxisjs/references/${m[1]}`)) broken.push(`${installed} → ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("only name docs pages that exist", () => {
    const sections = "guide|essentials|decorators|composables|css|ecosystem|advanced|tooling|performance|internal|changelog";
    const missing: string[] = [];
    for (const [installed, source] of files) {
      for (const m of read(source).matchAll(new RegExp(`["\`]((?:${sections})(?:/[a-z0-9-]+)*)["\`]`, "g"))) {
        if (!pages.has(m[1])) missing.push(`${installed}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("only call MCP tools the server defines", () => {
    const tools = new Set(TOOL_DEFINITIONS.map((t) => t.name));
    const unknown: string[] = [];
    for (const [installed, source] of files) {
      for (const m of read(source).matchAll(/\bpraxisjs_[a-z_]+\b/g)) {
        if (m[0].endsWith("_")) continue;
        if (!tools.has(m[0])) unknown.push(`${installed}: ${m[0]}`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("never teach the removed accessor APIs", () => {
    for (const [installed, source] of files) {
      if (installed === "praxisjs-upgrade/SKILL.md") continue;
      expect(read(source), installed).not.toMatch(/createAccessorDecorator|\baccessor\s+[a-z]\w*\s*=/);
    }
  });
});
