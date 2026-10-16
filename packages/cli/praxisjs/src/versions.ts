const DEFAULT_REGISTRY = "https://registry.npmjs.org";

/** Splits `^1.2.3` / `~1.2.3` / `1.2.3` into its prefix and version; other ranges are not handled. */
export function splitRange(range: string): { prefix: string; version: string } | undefined {
  const match = /^([\^~]?)(\d+\.\d+\.\d+(?:-[\w.]+)?)$/.exec(range);
  return match ? { prefix: match[1], version: match[2] } : undefined;
}

function parse(version: string): { core: number[]; pre: string | undefined } {
  const [core, pre] = version.split("-", 2);
  return { core: core.split(".").map(Number), pre };
}

/** Compares two `x.y.z[-pre]` versions. A prerelease sorts before its release. */
export function compareVersions(a: string, b: string): number {
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = left.core[i] - right.core[i];
    if (diff !== 0) return Math.sign(diff);
  }
  if (left.pre === right.pre) return 0;
  if (left.pre === undefined) return 1;
  if (right.pre === undefined) return -1;
  return left.pre < right.pre ? -1 : 1;
}

function registryUrl(): string {
  return (process.env.npm_config_registry ?? DEFAULT_REGISTRY).replace(/\/+$/, "");
}

export interface PublishedManifest {
  version: string;
  peerDependencies: Record<string, string>;
}

/**
 * The manifest of `name` at `tag` (a dist-tag such as `latest`, or an exact version) on the
 * configured registry, or `undefined` when it is unreachable or malformed.
 */
export async function fetchManifest(name: string, tag = "latest"): Promise<PublishedManifest | undefined> {
  try {
    const res = await fetch(`${registryUrl()}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { version?: unknown; peerDependencies?: unknown };
    if (typeof data.version !== "string") return undefined;
    const peers =
      typeof data.peerDependencies === "object" && data.peerDependencies !== null
        ? Object.entries(data.peerDependencies).filter((entry): entry is [string, string] => typeof entry[1] === "string")
        : [];
    return { version: data.version, peerDependencies: Object.fromEntries(peers) };
  } catch {
    return undefined;
  }
}

type Operator = "<" | "<=" | ">" | ">=" | "=";
interface Comparator {
  op: Operator;
  version: string;
}

function bump(parts: number[], index: number): string {
  return parts.map((part, i) => (i < index ? part : i === index ? part + 1 : 0)).join(".");
}

function parseComparator(token: string): Comparator[] | undefined {
  const match = /^(\^|~|>=|<=|>|<|=)?v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(-[\w.]+)?$/.exec(token);
  if (!match) return undefined;
  // Optional groups that didn't match are undefined at runtime, whatever RegExpExecArray says.
  const [, op = "", ...raw]: Array<string | undefined> = [...match];
  const pre = raw.pop() ?? "";
  // A wildcard makes every later part a wildcard too: `1.x.3` means `1.x`.
  const given = raw.findIndex((part) => part === undefined || /^[xX*]$/.test(part));
  const known = given === -1 ? 3 : given;
  if (known === 0) return [];
  const parts = raw.map((part, i) => (i < known ? Number(part) : 0));
  const base = parts.join(".") + (known === 3 ? pre : "");

  switch (op) {
    case "^": {
      const firstNonZero = parts.findIndex((part) => part !== 0);
      const index = Math.min(firstNonZero === -1 ? 2 : firstNonZero, known - 1);
      return [{ op: ">=", version: base }, { op: "<", version: bump(parts, index) }];
    }
    case "~":
      return [{ op: ">=", version: base }, { op: "<", version: bump(parts, known >= 2 ? 1 : 0) }];
    case ">":
      return [known === 3 ? { op: ">", version: base } : { op: ">=", version: bump(parts, known - 1) }];
    case "<=":
      return [known === 3 ? { op: "<=", version: base } : { op: "<", version: bump(parts, known - 1) }];
    case ">=":
    case "<":
      return [{ op, version: base }];
    default:
      return known === 3
        ? [{ op: "=", version: base }]
        : [{ op: ">=", version: base }, { op: "<", version: bump(parts, known - 1) }];
  }
}

function parseComparatorSet(set: string): Comparator[] | undefined {
  const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(set.trim());
  const tokens = hyphen
    ? [`>=${hyphen[1]}`, `<=${hyphen[2]}`]
    : set.replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1").split(/\s+/).filter(Boolean);
  const comparators: Comparator[] = [];
  for (const token of tokens) {
    const parsed = parseComparator(token);
    if (!parsed) return undefined;
    comparators.push(...parsed);
  }
  return comparators;
}

function matches(version: string, { op, version: bound }: Comparator): boolean {
  const order = compareVersions(version, bound);
  switch (op) {
    case "<":
      return order < 0;
    case "<=":
      return order <= 0;
    case ">":
      return order > 0;
    case ">=":
      return order >= 0;
    default:
      return order === 0;
  }
}

/**
 * Whether `version` is inside the npm-style `range` (`^`, `~`, comparators, x-ranges, hyphen
 * ranges, `||`), or `undefined` when the range uses syntax this parser doesn't know, such as a
 * `workspace:` or `npm:` specifier.
 */
export function satisfies(version: string, range: string): boolean | undefined {
  const sets: Comparator[][] = [];
  for (const part of range.split("||")) {
    const set = parseComparatorSet(part);
    if (!set) return undefined;
    sets.push(set);
  }
  return sets.some((set) => set.every((comparator) => matches(version, comparator)));
}
