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

const WORKSPACE_VERSION_RANGE = "workspace:*";
const DEFAULT_REGISTRY = "https://registry.npmjs.org";
const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const;

function registryUrl(): string {
  return (process.env.npm_config_registry ?? DEFAULT_REGISTRY).replace(/\/+$/, "");
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null;
}

/** Fetches the latest published version of `name` from the configured npm registry. */
export async function resolveLatestVersion(name: string): Promise<string> {
  const registry = registryUrl();
  const url = `${registry}/${encodeURIComponent(name)}/latest`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(
      `Failed to reach registry "${registry}" while resolving "${name}". Check your network connection.`,
      { cause },
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to resolve latest version of "${name}" from "${registry}" (HTTP ${String(response.status)}).`,
    );
  }

  const data = (await response.json()) as { version?: unknown };
  if (typeof data.version !== "string") {
    throw new Error(`Registry response for "${name}" did not include a version.`);
  }

  return data.version;
}

/**
 * Templates pin every @praxisjs/* dependency to "workspace:*" — the same
 * sentinel pnpm uses — instead of a real version. This resolves each one to
 * the latest published version at scaffold time, so create-praxisjs never
 * needs to be republished just because a @praxisjs/* package released a new
 * version.
 */
export async function resolveWorkspaceVersions(
  pkg: Record<string, unknown>,
): Promise<void> {
  const pending: Array<{ field: (typeof DEP_FIELDS)[number]; name: string }> = [];

  for (const field of DEP_FIELDS) {
    const deps = pkg[field];
    if (!isStringRecord(deps)) continue;
    for (const [name, range] of Object.entries(deps)) {
      if (range === WORKSPACE_VERSION_RANGE) pending.push({ field, name });
    }
  }

  if (pending.length === 0) return;

  const versions = await Promise.all(
    pending.map(({ name }) => resolveLatestVersion(name)),
  );

  pending.forEach(({ field, name }, i) => {
    const deps = pkg[field];
    if (isStringRecord(deps)) deps[name] = `^${versions[i]}`;
  });
}
