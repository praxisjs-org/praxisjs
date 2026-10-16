import { describe, it, expect, vi } from "vitest";

import { encodeVlq, keyedListsPlugin, transformKeyedLists } from "../keyed-lists";

const IMPORT = 'import { For as __PraxisFor } from "@praxisjs/runtime";\n';

function rewrite(code: string, file = "/app.tsx"): string {
  const result = transformKeyedLists(code, file);
  if (result === null) throw new Error("no result");
  return result.code;
}

function warningsOf(code: string): string[] {
  return transformKeyedLists(code, "/app.tsx")?.warnings.map((w) => w.message) ?? [];
}

describe("transformKeyedLists — rewrites", () => {
  it("rewrites a keyed .map() child into <For>", () => {
    const code = "const v = <ul>{() => this.rows.map((row) => <li key={row.id}>{row.label}</li>)}</ul>;";
    expect(rewrite(code)).toBe(
      IMPORT +
        "const v = <ul><__PraxisFor each={() => (this.rows)} by={(row) => (row.id)}>" +
        "{(__praxisItem) => () => { const row = __praxisItem(); return (<li key={row.id}>{row.label}</li>); }}" +
        "</__PraxisFor></ul>;",
    );
  });

  it("passes the index through when the callback takes one, and keeps destructuring and types", () => {
    const code = "<ol>{() => (list?.map(({ id, name }: Item, i: number) => (\n  <li key={id}>{i}{name}</li>\n)))}</ol>";
    expect(rewrite(code)).toBe(
      IMPORT +
        "<ol><__PraxisFor each={() => (list)} by={({ id, name }: Item, i: number) => (id)}>" +
        "{(__praxisItem, __praxisIndex) => () => { const { id, name } = __praxisItem(); const i = __praxisIndex(); " +
        "return (<li key={id}>{i}{name}</li>); }}</__PraxisFor></ol>",
    );
  });

  it("supports array patterns with holes and code ending in a newline", () => {
    const code = "<ul>{() => pairs.map(([, second]) => <li key={second}>{second}</li>)}</ul>\n";
    const out = rewrite(code);
    expect(out).toContain("const [, second] = __praxisItem();");
    expect(out.endsWith("</__PraxisFor></ul>\n")).toBe(true);
  });

  it("rewrites nested lists inside the row", () => {
    const code = "<ul>{() => a.map((x) => <li key={x.id}><ol>{() => x.items.map((y) => <b key={y} />)}</ol></li>)}</ul>";
    const out = rewrite(code);
    expect(out.match(/<__PraxisFor /g)).toHaveLength(2);
    expect(out).toContain("each={() => (x.items)} by={(y) => (y)}");
  });

  it("keeps a function child under components and fragments", () => {
    const code = "<Card>{() => a.map((x) => <i key={x} />)}</Card>";
    expect(rewrite(code)).toBe(
      IMPORT +
        "<Card>{() => <__PraxisFor each={() => (a)} by={(x) => (x)}>" +
        "{(__praxisItem) => () => { const x = __praxisItem(); return (<i key={x} />); }}</__PraxisFor>}</Card>",
    );
    expect(rewrite("<ui.List>{() => a.map((x) => <i key={x} />)}</ui.List>")).toContain("<ui.List>{() => <__PraxisFor");
    expect(rewrite("<>{() => a.map((x) => <i key={x} />)}</>")).toContain("<>{() => <__PraxisFor");
  });

  it("rewrites lists inside fragments, in .jsx files, with allowed globals and object keys", () => {
    const code = "<>{() => a.map((x) => <i key={JSON.stringify({ id: x.id, x })} />)}{() => b.map((y) => <i key={String(y.k as number)} />)}</>";
    const out = rewrite(code, "/app.jsx");
    expect(out.match(/<__PraxisFor /g)).toHaveLength(2);
  });

  it("produces a source map that points back at the original code", () => {
    const code = "const v = <ul>\n  {() => rows.map((row) => <li key={row.id}>{row.label}</li>)}\n</ul>;";
    const result = transformKeyedLists(code, "/app.tsx");
    const map = result?.map;
    expect(map?.sources).toEqual(["/app.tsx"]);
    expect(map?.sourcesContent).toEqual([code]);
    const out = result?.code ?? "";
    const decoded = decodeMappings(map?.mappings ?? "");
    const lines = out.split("\n");
    const lineIndex = lines.findIndex((l) => l.includes("row.label"));
    const column = lines[lineIndex].indexOf("{row.label}");
    const segment = decoded[lineIndex].filter((s) => s.column <= column).at(-1);
    expect(segment).toBeDefined();
    const original = code.split("\n")[segment?.sourceLine ?? -1];
    expect(original.slice(segment?.sourceColumn)).toContain("row.label");
    expect(decoded[1][0]).toEqual({ column: 0, sourceLine: 0, sourceColumn: 0 });
  });
});

describe("transformKeyedLists — leaves code alone", () => {
  it.each([
    ["no .map() at all", "<ul>{() => rows}</ul>"],
    ["a .map() without key", "<ul>{() => rows.map((r) => <li>{r}</li>)}</ul>"],
    ["an arrow with parameters", "<ul>{(x) => rows.map((r) => <li key={r} />)}</ul>"],
    ["a block-bodied outer arrow", "<ul>{() => { return rows.map((r) => <li key={r} />); }}</ul>"],
    ["something other than .map()", "<ul>{() => rows.filter((r) => <li key={r} />)}</ul>"],
    ["a non-call body", "<ul>{() => rows.map}</ul>"],
    ["a direct call", "<ul>{() => map((r) => <li key={r} />)}</ul>"],
    ["a .map() without arguments", "<ul>{() => rows.map()}</ul>"],
    ["an attribute value", "<Row render={() => rows.map((r) => <li key={r} />)} />"],
    ["a non-arrow child expression", "<ul>{rows.map((r) => <li key={r} />)}</ul>"],
    ["an empty child expression", "<ul>{/* key */}{}</ul>.map"],
    ["a nested key only", "<ul>{() => rows.map((r) => <li>{() => r.c.map}<b key={1} /></li>)}</ul>"],
  ])("%s", (_name, code) => {
    expect(transformKeyedLists(`${code} /* .map key */`, "/app.tsx")).toBeNull();
  });

  it("returns null without parsing when the code can't contain a keyed .map()", () => {
    expect(transformKeyedLists("const a = 1;", "/a.tsx")).toBeNull();
    expect(transformKeyedLists("x.map((y) => y)", "/a.tsx")).toBeNull();
  });
});

describe("transformKeyedLists — warnings", () => {
  it.each([
    ["more than one argument", "<ul>{() => rows.map((r) => <li key={r} />, this)}</ul>"],
    ["type arguments", "<ul>{() => rows.map<Node>((r) => <li key={r} />)}</ul>"],
    ["not an arrow function", "<ul>{() => rows.map(function (r) { return <li key={r} />; })}</ul>"],
    ["is async", "<ul>{() => rows.map(async (r) => <li key={r} />)}</ul>"],
    ["(item) or (item, index)", "<ul>{() => rows.map(() => <li key={1} />)}</ul>"],
    ["(item) or (item, index)", "<ul>{() => rows.map((a, b, c) => <li key={a} />)}</ul>"],
    ["(item) or (item, index)", "<ul>{() => rows.map((...a) => <li key={a} />)}</ul>"],
    ["(item) or (item, index)", "<ul>{() => rows.map((a = 1) => <li key={a} />)}</ul>"],
    ["block body", "<ul>{() => rows.map((r) => { return <li key={r} />; })}</ul>"],
    ["single JSX element", "<ul>{() => rows.map((r) => (r.ok ? <li key={r} /> : <b key={r} />))}</ul>"],
    ["not on the element", "<ul>{() => rows.map((r) => <Row slot={<b key={r} />} />)}</ul>"],
    ["is a constant", '<ul>{() => rows.map((r) => <li key="same" />)}</ul>'],
    ["is a constant", "<ul>{() => rows.map((r) => <li key />)}</ul>"],
    ["is a constant", "<ul>{() => rows.map((r) => <li key={/* */} />)}</ul>"],
    ["something other than the callback's parameters", "<ul>{() => rows.map((r) => <li key={this.keyOf(r)} />)}</ul>"],
    ["something other than the callback's parameters", "<ul>{() => rows.map((r) => <li key={prefix + r.id} />)}</ul>"],
  ])("warns when the callback %s", (reason, code) => {
    const warnings = warningsOf(code);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(reason);
    expect(warnings[0]).toContain("<For each={…} by={…}>");
  });

  it("reports the location and keeps the code when nothing could be rewritten", () => {
    const code = "\n  <ul>{() => rows.map((r) => <li key={this.k(r)} />)}</ul>";
    const result = transformKeyedLists(code, "/app.tsx");
    expect(result?.code).toBe(code);
    expect(result?.map).toBeNull();
    expect(result?.warnings[0]).toMatchObject({ line: 2, column: 7 });
  });
});

describe("encodeVlq", () => {
  it("encodes positive, negative and multi-digit values", () => {
    expect(encodeVlq(0)).toBe("A");
    expect(encodeVlq(1)).toBe("C");
    expect(encodeVlq(-1)).toBe("D");
    expect(encodeVlq(16)).toBe("gB");
    expect(encodeVlq(-1000)).toBe("x+B");
  });
});

describe("keyedListsPlugin", () => {
  interface Ctx { warn: (message: string) => void }
  type Transform = (this: Ctx, code: string, id: string) => { code: string; map: unknown } | null;

  function hook(options?: Parameters<typeof keyedListsPlugin>[0]): {
    transform: (code: string, id: string) => ReturnType<Transform>;
    warn: ReturnType<typeof vi.fn>;
  } {
    const plugin = keyedListsPlugin(options);
    const warn = vi.fn();
    const transform = plugin.transform as unknown as Transform;
    return { transform: (code, id) => transform.call({ warn }, code, id), warn };
  }

  const keyed = "<ul>{() => rows.map((r) => <li key={r.id} />)}</ul>";
  const unsafe = "<ul>{() => rows.map((r) => <li key={this.k(r)} />)}</ul>";

  it("is a pre plugin named praxisjs:keyed-lists", () => {
    const plugin = keyedListsPlugin();
    expect(plugin.name).toBe("praxisjs:keyed-lists");
    expect(plugin.enforce).toBe("pre");
  });

  it("only handles .tsx/.jsx outside node_modules", () => {
    const { transform } = hook();
    expect(transform(keyed, "/src/a.ts")).toBeNull();
    expect(transform(keyed, "/node_modules/x/a.tsx")).toBeNull();
    expect(transform("const a = 1", "/src/a.tsx")).toBeNull();
    expect(transform(keyed, "/src/a.tsx?v=1")?.code).toContain("__PraxisFor");
  });

  it("handles the node_modules files of a library that opts in, without warning about its code", () => {
    const warn = vi.fn();
    const plugin = keyedListsPlugin({}, (id) => id.includes("/node_modules/ui/"));
    const transform = (code: string, id: string) =>
      (plugin.transform as unknown as (this: { warn: typeof warn }, code: string, id: string) => { code: string } | null).call({ warn }, code, id);
    expect(transform(keyed, "/node_modules/ui/src/a.tsx")?.code).toContain("__PraxisFor");
    expect(transform(keyed, "/node_modules/other/src/a.tsx")).toBeNull();
    expect(transform(unsafe, "/node_modules/ui/src/a.tsx")).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it("forwards warnings with their location, unless disabled", () => {
    const { transform, warn } = hook();
    expect(transform(unsafe, "/src/a.tsx")).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^\/src\/a\.tsx:1:5 keyed `\.map\(\)` left as is/));
    const silent = hook({ warn: false });
    silent.transform(unsafe, "/src/a.tsx");
    expect(silent.warn).not.toHaveBeenCalled();
  });
});

interface Segment { column: number; sourceLine: number; sourceColumn: number }

function decodeMappings(mappings: string): Segment[][] {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let sourceLine = 0;
  let sourceColumn = 0;
  return mappings.split(";").map((line) => {
    let column = 0;
    if (line === "") return [];
    return line.split(",").map((segment) => {
      const values: number[] = [];
      let value = 0;
      let shift = 0;
      for (const ch of segment) {
        const digit = chars.indexOf(ch);
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
        } else {
          values.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      column += values[0];
      sourceLine += values[2];
      sourceColumn += values[3];
      return { column, sourceLine, sourceColumn };
    });
  });
}
