// @vitest-environment jsdom
import ts from "typescript";
import { describe, it, expect } from "vitest";

import { transformKeyedLists } from "../keyed-lists";

interface Signal<T> { (): T; set(value: T): void }

// The framework packages are not dependencies of the plugin, so they're loaded by specifier at
// runtime (vitest resolves them to their sources) instead of being typechecked here.
const specifiers = { core: "@praxisjs/core/internal", runtime: "@praxisjs/runtime", jsx: "../../../../foundation/jsx/src/jsx-runtime" };
const { signal } = (await import(/* @vite-ignore */ specifiers.core)) as { signal: <T>(value: T) => Signal<T> };
const { For, render } = (await import(/* @vite-ignore */ specifiers.runtime)) as {
  For: unknown;
  render: (factory: () => Node, container: HTMLElement) => () => void;
};
const { jsx } = (await import(/* @vite-ignore */ specifiers.jsx)) as {
  jsx: (type: unknown, props: Record<string, unknown>) => Node;
};

// Compiles the rewritten TSX with a classic `h` factory and runs it against the real runtime, so the
// test exercises what the rewrite produces, not just its text.
function compile(source: string): (scope: Record<string, unknown>) => unknown {
  const rewritten = transformKeyedLists(source, "/app.tsx")?.code ?? source;
  const body = rewritten.replace(/^import .*\n/, "");
  const { outputText } = ts.transpileModule(`return (${body});`, {
    compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: "h", target: ts.ScriptTarget.ES2022 },
    fileName: "/app.tsx",
  });
  return (scope) => {
    const names = Object.keys(scope);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function(...names, outputText)(...names.map((n) => scope[n])) as unknown;
  };
}

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) =>
  jsx(type, { ...props, children: children.length <= 1 ? children[0] : children });

interface Row { id: number; label: string }

describe("keyed .map() rewrite — runtime behavior", () => {
  it("reuses rows across updates and still reflects new objects and indices", () => {
    const rows = signal<Row[]>([{ id: 1, label: "a" }, { id: 2, label: "b" }, { id: 3, label: "c" }]);
    const view = compile("<ul>{() => rows().map((row, i) => <li key={row.id}>{i}:{row.label}</li>)}</ul>");
    const container = document.createElement("div");
    render(() => view({ h, rows, __PraxisFor: For }) as Node, container);

    const before = Array.from(container.querySelectorAll("li"));
    expect(container.textContent).toBe("0:a1:b2:c");

    const [a, b, c] = rows();
    rows.set([c, b, { ...a, label: "A" }]);
    const after = Array.from(container.querySelectorAll("li"));
    expect(container.textContent).toBe("0:c1:b2:A");
    expect(after[1]).toBe(before[1]);

    rows.set([b, c]);
    expect(container.textContent).toBe("0:b1:c");
  });

  it("matches the original .map() output when the key can't be rewritten", () => {
    const rows = signal([1, 2]);
    const keyOf = (n: number) => n;
    const view = compile("<ul>{() => rows().map((n) => <li key={keyOf(n)}>{n}</li>)}</ul>");
    const container = document.createElement("div");
    render(() => view({ h, rows, keyOf, __PraxisFor: For }) as Node, container);
    rows.set([2, 1, 3]);
    expect(container.textContent).toBe("213");
  });
});
