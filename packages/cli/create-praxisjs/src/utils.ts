import fs from "node:fs";
import path from "node:path";

export function formatTargetDir(targetDir: string): string {
  return targetDir.trim().replace(/\/+$/g, "");
}

function sanitizeNamePart(part: string): string {
  return part
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z\d\-~]+/g, "-");
}

export function toValidPackageName(name: string): string {
  const trimmed = name.trim();
  // Preserve scoped package names: @scope/pkg — sanitize scope and pkg separately
  if (trimmed.startsWith("@") && trimmed.includes("/")) {
    const slashIdx = trimmed.indexOf("/");
    const scope = trimmed.slice(1, slashIdx); // e.g. "org"
    const pkg = trimmed.slice(slashIdx + 1);   // e.g. "pkg"
    return `@${sanitizeNamePart(scope)}/${sanitizeNamePart(pkg)}`;
  }
  return sanitizeNamePart(trimmed);
}

export function isEmpty(dirPath: string): boolean {
  let files: string[];
  try {
    files = fs.readdirSync(dirPath);
  } catch {
    // Directory does not exist — treat as empty
    return true;
  }
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

export function emptyDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file === ".git") continue;
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

export function copy(src: string, dest: string): void {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copy(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

export function pkgManagerFromAgent(): string {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("bun")) return "bun";
  return "npm";
}
