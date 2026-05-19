import { marked } from "marked";

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const m = FM_RE.exec(content);
  if (!m) return { data: {}, body: content.trim() };
  return {
    data: parseSimpleYaml(m[1]),
    body: content.slice(m[0].length).trim(),
  };
}

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const raw = trimmed.slice(colon + 1).trim();
    if (key) result[key] = parseYamlValue(raw);
  }
  return result;
}

function parseYamlValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null" || raw === "~") return null;

  const num = Number(raw);
  if (raw !== "" && !isNaN(num)) return num;

  if (raw.startsWith("[") && raw.endsWith("]")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((v) => parseYamlValue(v.trim()))
      .filter((v) => v !== "");
  }

  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }

  return raw;
}

export function defaultRender(markdown: string): string {
  return marked.parse(markdown) as string;
}
