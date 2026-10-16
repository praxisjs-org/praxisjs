// @vitest-environment jsdom
import ts from "typescript";
import { describe, it, expect } from "vitest";

import { cleanJsxText, decodeEntities, templatesPlugin, transformTemplates } from "../templates";

interface Signal<T> { (): T; set(value: T): void }

const specifiers = { core: "@praxisjs/core/internal", runtime: "@praxisjs/runtime", jsx: "../../../../foundation/jsx/src/jsx-runtime" };
const { signal } = (await import(/* @vite-ignore */ specifiers.core)) as { signal: <T>(value: T) => Signal<T> };
const runtime = (await import(/* @vite-ignore */ specifiers.runtime)) as Record<string, unknown> & {
  render: (factory: () => Node, container: HTMLElement) => () => void;
};
const { jsx, Fragment } = (await import(/* @vite-ignore */ specifiers.jsx)) as {
  jsx: (type: unknown, props: Record<string, unknown>) => Node;
  Fragment: symbol;
};

const HELPERS = [
  "template", "html", "element", "prop", "reactive", "insert", "reactiveOnly", "insertOnly", "scope", "event", "onEvent",
  "className",
];

const h = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) =>
  jsx(type, { ...props, children: children.length <= 1 ? children[0] : children });

function code(source: string): string {
  return transformTemplates(`const view = () => (${source});`, "/app.tsx")?.code ?? "";
}

// Compiles `source` (a JSX expression) with or without templates and returns a factory for it.
function compile(source: string, templates: boolean): (scope: Record<string, unknown>) => Node {
  const module = `const view = () => (${source});`;
  const compiled = templates ? (transformTemplates(module, "/app.tsx")?.code ?? module) : module;
  const body = compiled.replace(/^import .*\n/, "");
  const { outputText } = ts.transpileModule(`${body}\nreturn view();`, {
    compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: "h", jsxFragmentFactory: "Fragment", target: ts.ScriptTarget.ES2022 },
    fileName: "/app.tsx",
  });
  return (scope) => {
    const all: Record<string, unknown> = { h, Fragment, ...scope };
    for (const name of HELPERS) all[`_$px${name}`] = runtime[`_$${name}`];
    const names = Object.keys(all);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function(...names, outputText)(...names.map((n) => all[n])) as Node;
  };
}

function mount(view: (scope: Record<string, unknown>) => Node, scope: Record<string, unknown> = {}): HTMLElement {
  const container = document.createElement("div");
  runtime.render(() => view(scope), container);
  return container;
}

/** Renders `source` both ways and checks the DOM is identical. */
function same(source: string, scope: Record<string, unknown> = {}): HTMLElement {
  const templated = mount(compile(source, true), scope);
  const plain = mount(compile(source, false), scope);
  expect(templated.innerHTML).toBe(plain.innerHTML);
  return templated;
}

describe("cleanJsxText", () => {
  it("follows the JSX whitespace rules", () => {
    expect(cleanJsxText("  hello  ")).toBe("  hello  ");
    expect(cleanJsxText("\n   hello\n   world  \n  ")).toBe("hello world");
    expect(cleanJsxText("\n  \n  ")).toBe("");
    expect(cleanJsxText("a\t\n\tb")).toBe("a b");
    // The outputs of oxc's JSX transform for the same text.
    expect(cleanJsxText("\n\t\ta\t\n\t\tb  \n")).toBe("a b");
    expect(cleanJsxText("a\t \n\t b")).toBe("a b");
    expect(cleanJsxText("\ta\t")).toBe("\ta\t");
    expect(cleanJsxText("a\n\n\nb")).toBe("a b");
    expect(cleanJsxText("\r\n  a  \r\n b")).toBe("a b");
    expect(cleanJsxText(" \t\n\t c \t\n \t")).toBe("c");
  });
});

describe("decodeEntities", () => {
  it("decodes named, decimal and hex entities, and refuses unknown names", () => {
    expect(decodeEntities("a &amp; b &lt;&gt; &#65;&#x42;&nbsp;")).toBe("a & b <> AB ");
    expect(decodeEntities("no entities")).toBe("no entities");
    expect(decodeEntities("&unknownthing;")).toBeNull();
  });
});

describe("transformTemplates — output", () => {
  it("turns an arrow function's template body into a block body, and keeps the IIFE elsewhere", () => {
    const arrow = transformTemplates("const row = (r) => (<tr><td>{r.id}</td></tr>);", "/a.tsx")?.code ?? "";
    expect(arrow).toContain("const row = (r) => { const _$pxs = _$pxscope(); const _$pxr = _$pxT0();");
    expect(arrow).not.toContain("(_$pxs) =>");
    const plain = transformTemplates("const v = cond && <tr><td>{r.id}</td></tr>;", "/a.tsx")?.code ?? "";
    expect(plain).toContain("cond && ((_$pxs) => {");
    const nested = transformTemplates("const f = () => (((<p><b>{x}</b></p>)));", "/a.tsx")?.code ?? "";
    expect(nested).toMatch(/const f = \(\) => \{ const _\$pxs = _\$pxscope\(\);.*return _\$pxr; \};/);
  });

  it("turns a returned template into statements, in any statement position", () => {
    const parse = (out: string) =>
      ts.transpileModule(out, { fileName: "/a.tsx", reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.Preserve } })
        .diagnostics ?? [];
    const method = transformTemplates("class A { render() { return (<li><b>{this.x}</b></li>); } }", "/a.tsx")?.code ?? "";
    expect(method).toContain("render() { { const _$pxs = _$pxscope(); const _$pxr = _$pxT0();");
    expect(method).toContain("return _$pxr; } }");
    expect(parse(method)).toEqual([]);
    const branch = transformTemplates("function f(x) { if (x) return <p><b>{x}</b></p>; return null; }", "/a.tsx")?.code ?? "";
    expect(branch).toContain("if (x) { const _$pxs");
    expect(parse(branch)).toEqual([]);
    const fixed = transformTemplates('function g() { return <p class="a">b</p>; }', "/a.tsx")?.code ?? "";
    expect(fixed).toContain("function g() { return _$pxT0(); }");
  });

  it("renders returned templates like jsx()", () => {
    const run = (code: string) => {
      const compiled = (transformTemplates(code, "/app.tsx")?.code ?? code).replace(/^import .*\n/, "");
      const { outputText } = ts.transpileModule(`${compiled}\nreturn view;`, {
        compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: "h", target: ts.ScriptTarget.ES2022 },
        fileName: "/app.tsx",
      });
      const all: Record<string, unknown> = { h };
      for (const name of HELPERS) all[`_$px${name}`] = runtime[`_$${name}`];
      const names = Object.keys(all);
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      return new Function(...names, outputText)(...names.map((n) => all[n])) as (x: number) => Node;
    };
    const view = run("function view(x) { if (x > 1) return <p><b>{x}</b></p>; return <i>{x}</i>; }");
    expect(mount(() => view(2)).innerHTML).toBe("<p><b>2</b></p>");
    expect(mount(() => view(1)).innerHTML).toBe("<i>1</i>");
  });

  it("leaves no placeholder for a reactive only child", () => {
    const out = transformTemplates("const v = () => <p><b>{() => x}</b></p>;", "/a.tsx")?.code ?? "";
    expect(out).toContain('_$pxhtml("<p><b>")');
    expect(out).toContain("_$pxreactiveOnly(");
  });

  it("returns null without JSX or without a tree worth a template", () => {
    expect(transformTemplates("const a = 1 + 2;", "/a.ts")).toBeNull();
    expect(transformTemplates("const a = <div>{x}</div>;", "/a.tsx")).toBeNull();
    expect(transformTemplates("const a = <Comp><Other /></Comp>;", "/a.jsx")).toBeNull();
  });

  it("hoists one template per tree, built from static parts only", () => {
    const out = code('<ul class="list"><li id="a">One</li><li>{label}</li></ul>');
    expect(out).toContain('_$pxhtml("<ul class=list><li id=a>One</li><li>")');
    expect(out).toContain("_$pxinsertOnly(");
    const built = code('<ul class="list"><li tabIndex={1}>One</li><li>{label}</li></ul>');
    expect(built).toContain('_$pxtemplate(() => _$pxelement("ul", { "class": "list" }, [_$pxelement("li", { "tabIndex": 1 }, ["One"]), _$pxelement("li", null, null)])');
  });

  it("treats literals behind type assertions as static", () => {
    const out = code('<p><span aria-hidden={"true" as const} tabIndex={0} hidden data-x={null} /></p>');
    expect(out).toContain('{ "aria-hidden": "true", "tabIndex": 0, "hidden": true, "data-x": null }');
    expect(out).not.toContain("_$pxprop(");
  });

  it("leaves trees with spreads, a children attribute, unknown entities or suspension to jsx()", () => {
    expect(code("<div {...rest}><span /></div>")).toBe("");
    expect(code("<div children={x}><span /></div>")).toBe("");
    expect(code("<div><span>&unknownthing;</span></div>")).toBe("");
    expect(code('<div title="&unknownthing;"><span /></div>')).toBe("");
    expect(transformTemplates("async function f() { return <div><span>{await x}</span></div>; }", "/a.tsx")).toBeNull();
    expect(transformTemplates("async function f() { return <div><span id={await x} /></div>; }", "/a.tsx")).toBeNull();
  });

  it("keeps await inside nested functions, which run on their own", () => {
    expect(code("<div><button onClick={async () => { await x; }} /></div>")).toContain("_$pxtemplate");
  });

  it("wraps a tree in braces where JSX children or attribute values go", () => {
    expect(code("<Comp><div><span /></div></Comp>")).toMatch(/<Comp>\{_\$pxT0\(\)\}<\/Comp>/);
    expect(code("<Comp icon=<div><span /></div> />")).toMatch(/icon=\{_\$pxT0\(\)\}/);
  });

  it("maps the output back to the source", () => {
    const result = transformTemplates("const a = 1;\nconst v = <div><span>{x}</span></div>;", "/a.tsx");
    expect(result?.map.sources).toEqual(["/a.tsx"]);
    expect(result?.map.mappings.startsWith(";;")).toBe(true);
  });
});

describe("transformTemplates — same DOM as jsx()", () => {
  it("static trees, text with entities and whitespace", () => {
    same('<div class="a" id="x"><h1>Title &amp; more</h1>\n   <p>line one\n   line two</p><br /></div>');
  });

  it("keeps the whitespace around text between elements and expressions", () => {
    same("<p>Rendered as <code>a</code> via <code>b</code>.</p>");
    same("<small>{v} / {m}</small>", { v: 1, m: 5 });
    same("<span>Page {page}of {total}</span>", { page: 1, total: 5 });
    same("<div>\n  <b>x</b>   tail  \n  <i>y</i>{\" \"}end\n  more   text\n\n</div>");
    same("<p>  lead<b> inner </b>\ttab\t<i />  </p>");
    const container = same("<small>{v} / {m}</small>", { v: 1, m: 5 });
    expect(container.textContent).toBe("1 / 5");
  });

  it("literal children and empty expressions", () => {
    same('<p><b>{"text"}</b><i>{42}</i>{/* comment */}<u>{0}</u></p>');
  });

  it("dynamic text in every position", () => {
    same("<p>a{x}b<span>{y}</span>{x}<i /></p>", { x: "X", y: 7 });
  });

  it("components, fragments and keyed lists as children", () => {
    const list = ["a", "b"];
    same("<ul><>{list.map((s) => <li>{s}</li>)}</></ul>", { list });
  });
});

describe("transformTemplates — runtime behavior", () => {
  it("updates reactive text, attributes and events in place", () => {
    const label = signal("a");
    const active = signal(false);
    let clicks = 0;
    const container = mount(compile(
      '<div class={() => (active() ? "on" : "off")}><a onClick={() => { clicks++; }}>{() => label()}</a><span>{() => label()}!</span></div>',
      true,
    ), { label, active, clicks: undefined });
    const div = container.firstElementChild as HTMLElement;
    const link = div.querySelector("a") as HTMLElement;
    const text = link.firstChild;
    expect(div.outerHTML).toBe('<div class="off"><a>a</a><span>a<!---->!</span></div>');

    label.set("b");
    active.set(true);
    expect(link.firstChild).toBe(text);
    expect(div.outerHTML).toBe('<div class="on"><a>b</a><span>b<!---->!</span></div>');
    link.dispatchEvent(new MouseEvent("click"));
    expect(clicks).toBe(0);
  });

  it("swaps a reactive child between text and elements", () => {
    const show = signal(false);
    const container = mount(compile("<p><b>{() => (show() ? <i>yes</i> : \"no\")}</b><u /></p>", true), { show });
    expect(container.innerHTML).toBe("<p><b>no</b><u></u></p>");
    show.set(true);
    expect(container.innerHTML).toBe("<p><b><i>yes</i></b><u></u></p>");
  });

  it("applies a parent's props after its children are in place, like jsx()", () => {
    const source = '<select value="b"><option value="a">A</option><option value="b">B</option></select>';
    for (const templates of [true, false]) {
      const select = mount(compile(source, templates)).firstElementChild as HTMLSelectElement;
      expect(select.value).toBe("b");
    }
    const dynamic = signal("b");
    const select = mount(compile('<select value={() => dynamic()}><option value="a">A</option><option value="b">B</option></select>', true), { dynamic })
      .firstElementChild as HTMLSelectElement;
    expect(select.value).toBe("b");
  });

  it("templates the JSX inside a component's children and inside expressions", () => {
    const out = code("<Comp>{() => <div><span>{x}</span></div>}</Comp>");
    expect(out).toContain("_$pxT0");
    const items = signal([1, 2]);
    const container = mount(compile("<ul>{() => items().map((n) => <li><b>{n}</b></li>)}</ul>", true), { items });
    expect(container.innerHTML).toBe("<ul><li><b>1</b></li><li><b>2</b></li></ul>");
  });

  it("handles namespaced and JSX-valued attributes as dynamic props", () => {
    const out = code('<svg><use xlink:href={ref} /><g /></svg>');
    expect(out).toContain('_$pxprop(');
    expect(out).toContain('"xlink:href"');
  });

  it("compiles every tree of a module, in source order", () => {
    const out = transformTemplates("const a = <div><span /></div>;\nconst b = <p><i /></p>;", "/a.tsx")?.code ?? "";
    expect(out.indexOf("_$pxT0 =")).toBeLessThan(out.indexOf("_$pxT1 ="));
    expect(out).toMatch(/const a = _\$pxT0\(\);\nconst b = _\$pxT1\(\);/);
  });

  it("keeps boolean literals and drops keys and empty attribute expressions", () => {
    const out = code('<ul><li key="k" a={true} b={false} c={} /><li /></ul>');
    expect(out).toContain('{ "a": true, "b": false }');
  });

  it("stops at the first suspension in an expression", () => {
    expect(transformTemplates("async function f() { return <div><span>{(await a) + (await b)}</span></div>; }", "/a.tsx")).toBeNull();
  });

  it("inserts elements that cannot be part of a template as dynamic children", () => {
    const out = code("<div><x.Y /><span {...rest} /><i /></div>");
    expect(out).toContain("_$pxinsert(_$pxr, <x.Y />");
    expect(out).toContain("_$pxinsert(_$pxr, <span {...rest} />");
  });

  it("anchors a dynamic child that precedes a reactive one on the reactive one's marker", () => {
    const x = "x";
    const y = signal("y");
    const container = mount(compile("<p><b />{x}{() => y()}</p>", true), { x, y });
    expect(container.innerHTML).toBe("<p><b></b>xy<!----></p>");
    y.set("Y");
    expect(container.innerHTML).toBe("<p><b></b>xY<!----></p>");
  });

  it("reaches dynamic parts nested below static elements", () => {
    same("<div><p><span>{x}</span></p><i /></div>", { x: "deep" });
  });

  it("passes a JSX attribute value to the element as a prop, compiled in expression position", () => {
    expect(code("<div><span icon=<b /> /></div>")).toContain('_$pxprop(_$pxn0, "icon", <b />, _$pxs)');
    expect(code("<div><span icon=<p><b /></p> /></div>")).toContain('_$pxprop(_$pxn0, "icon", _$pxT1(), _$pxs)');
    same("<div><span title=<p><b /></p> /></div>");
  });

  it("inserts a spread child before the next static node", () => {
    const parts = ["x", "y"];
    same("<p>{...parts}<b /></p>", { parts });
  });
});

describe("templatesPlugin", () => {
  it("transforms JSX modules outside node_modules only", () => {
    const plugin = templatesPlugin() as { transform: (code: string, id: string) => unknown };
    const source = "const v = <div><span /></div>;";
    expect(plugin.transform(source, "/src/a.tsx")).toMatchObject({ code: expect.stringContaining("_$pxT0") as unknown });
    expect(plugin.transform(source, "/node_modules/x/a.tsx")).toBeNull();
    expect(plugin.transform(source, "/src/a.ts")).toBeNull();
    expect(plugin.transform("const v = 1;", "/src/a.tsx")).toBeNull();
    const custom = templatesPlugin({ include: /\.ts$/ }) as { transform: (code: string, id: string) => unknown };
    expect(custom.transform(source, "/src/a.ts")).not.toBeNull();
  });
});

describe("transformTemplates — lone elements", () => {
  it("templates a lone element with static attributes, text or a reactive child, and nothing else", () => {
    expect(code('<i class="icon" />')).toContain("_$pxT0()");
    expect(code("<b>bold</b>")).toContain("_$pxT0()");
    expect(code("<em>{() => x()}</em>")).toContain("_$pxreactiveOnly(_$pxr, ");
    expect(code("<span />")).toBe("");
    expect(code("<div onClick={f}>{x}</div>")).toBe("");
  });

  it("renders a lone element the same as jsx(), without the reactive child's anchor", () => {
    const value = signal("a");
    const container = mount(compile('<em class="badge">{() => value()}</em>', true), { value });
    expect(container.innerHTML).toBe('<em class="badge">a</em>');
    value.set("b");
    expect(container.innerHTML).toBe('<em class="badge">b</em>');
    same('<i class="icon" title="t" />');
  });
});

describe("transformTemplates — delegated events", () => {
  it("binds every event prop through one hoisted target per event name and other props through prop()", () => {
    const out = code("<tr onClick={r}><td><a onClick={a} title={t} /></td><td><a onKeyDown={k} /></td></tr>");
    expect(out).toContain('const _$pxe0 = /* @__PURE__ */ _$pxevent("onClick");\nconst _$pxe1 = /* @__PURE__ */ _$pxevent("onKeyDown");\nconst _$pxT0');
    expect(out).toContain("_$pxonEvent(_$pxr, _$pxe0, r, _$pxs)");
    expect(out).toContain("_$pxonEvent(_$pxn2, _$pxe0, a, _$pxs)");
    expect(out).toContain('_$pxprop(_$pxn2, "title", t, _$pxs)');
    expect(out).toContain("_$pxonEvent(_$pxn3, _$pxe1, k, _$pxs)");
    expect(out.match(/_\$pxevent\(/g)).toHaveLength(2);
  });

  it("shares the event targets between the trees of a module", () => {
    const out = transformTemplates("const a = <p><b onClick={f} /></p>;\nconst b = <i><u onClick={g} /></i>;", "/a.tsx")?.code ?? "";
    expect(out.match(/_\$pxevent\(/g)).toHaveLength(1);
    expect(out).toContain("_$pxonEvent(_$pxn0, _$pxe0, f, _$pxs)");
    expect(out).toContain("_$pxonEvent(_$pxn0, _$pxe0, g, _$pxs)");
  });

  it("binds a prop that only looks like an event as a plain prop", () => {
    const container = same("<p><b onWhatever={value} /></p>", { value: "x" });
    expect(container.querySelector("b")?.getAttribute("onWhatever")).toBe("x");
  });

  it("runs the handlers of delegated elements", () => {
    const calls: string[] = [];
    const a = () => { calls.push("a"); };
    const b = () => { calls.push("b"); };
    const container = mount(compile("<p><button onClick={a}>a</button><button onClick={b}>b</button></p>", true), { a, b });
    const [first, second] = Array.from(container.querySelectorAll("button"));
    second.click();
    first.click();
    expect(calls).toEqual(["b", "a"]);
  });
});

describe("transformTemplates — reactive class", () => {
  it("binds a function-literal class or className through className() and any other value through prop()", () => {
    expect(code("<p><b class={() => c()} /></p>")).toContain("_$pxclassName(_$pxn0, () => c(), _$pxs)");
    expect(code("<p><b className={function () { return c(); }} /></p>")).toContain("_$pxclassName(_$pxn0, function");
    expect(code("<p><b class={(() => c()) as never} /></p>")).toContain("_$pxclassName(_$pxn0, (() => c()) as never, _$pxs)");
    expect(code("<p><b class={c} /></p>")).toContain('_$pxprop(_$pxn0, "class", c, _$pxs)');
    expect(code('<p><b class="x" /></p>')).not.toContain("_$pxclassName(");
  });

  it("keeps a reactive class and className on one element on prop(), each under its own key", () => {
    const out = code("<p><b class={() => a()} className={() => b()} /><i class={() => a()} className={b} /></p>");
    expect(out).toContain('_$pxprop(_$pxn0, "class", () => a(), _$pxs)');
    expect(out).toContain('_$pxprop(_$pxn0, "className", () => b(), _$pxs)');
    expect(out).toContain("_$pxclassName(_$pxn1, () => a(), _$pxs)");
    expect(out).toContain('_$pxprop(_$pxn1, "className", b, _$pxs)');
  });

  it("renders and updates like jsx(), on HTML and SVG elements", () => {
    const source =
      "<div><b class={() => cls()} /><i className={() => cls()} /><svg><g class={() => cls()} /></svg></div>";
    const cls = signal<string | null>("a");
    const templated = mount(compile(source, true), { cls });
    const plain = mount(compile(source, false), { cls });
    expect(templated.innerHTML).toBe('<div><b class="a"></b><i class="a"></i><svg><g class="a"></g></svg></div>');
    expect(templated.innerHTML).toBe(plain.innerHTML);
    cls.set("b");
    expect(templated.innerHTML).toBe(plain.innerHTML);
    cls.set(null);
    expect(templated.innerHTML).toBe('<div><b></b><i></i><svg><g></g></svg></div>');
    expect(templated.innerHTML).toBe(plain.innerHTML);
  });

  it("hydrates a server-rendered tree, binding the class and the event on the real elements", () => {
    const cls = signal("a");
    const clicks: string[] = [];
    const onClick = () => { clicks.push(cls()); };
    const container = document.createElement("div");
    container.setAttribute("data-praxis-ssg", "");
    container.innerHTML = '<p><b class="a">x</b></p>';
    const real = container.querySelector("b") as HTMLElement;
    document.body.appendChild(container);
    (runtime.enableHydration as () => void)();
    runtime.render(() => compile("<p><b class={() => cls()} onClick={onClick}>x</b></p>", true)({ cls, onClick }), container);
    expect(container.querySelector("b")).toBe(real);
    cls.set("b");
    expect(real.className).toBe("b");
    real.click();
    expect(clicks).toEqual(["b"]);
    container.remove();
  });
});

describe("transformTemplates — HTML templates", () => {
  const markup = (source: string) => /_\$pxhtml\((".*?")\);/.exec(code(source))?.[1];

  it("emits the markup of a tree the parser reads back unchanged, without the closing tags at its end", () => {
    expect(markup('<ul class="list"><li id="a">One</li><li>{label}</li></ul>')).toBe('"<ul class=list><li id=a>One</li><li>"');
    expect(markup('<div title="a &quot;b&quot; c" class="" lang="en"><b>x</b> tail</div>'))
      .toBe('"<div title=\\"a &quot;b&quot; c\\" class=\\"\\" lang=en><b>x</b> tail"');
    expect(markup('<p>{"a < b & c"}<b>{"\\r"}</b></p>')).toBe('"<p>a &lt; b &amp; c<b>&#13;"');
    expect(markup('<p data-x={"\\r&"} />')).toBe('"<p data-x=\\"&#13;&amp;\\">"');
    expect(markup("<div>{() => a}<span>s</span>{() => b}</div>")).toBe('"<div><!----><span>s</span><!---->"');
    expect(markup('<label htmlFor="i" className="c">L</label>')).toBe('"<label for=i class=c>L"');
    expect(markup("<div tabindex={0} data-n={1_000} id={1e21} data-f={false} data-z={null} hidden={true} aria-x={true}>x</div>"))
      .toBe('"<div tabindex=0 data-n=1000 id=1e+21 hidden aria-x>x"');
  });

  it("renders the same DOM as jsx()", () => {
    const sources = [
      '<div class="a b" id="x" data-v="1" aria-label="q&quot;"><p>text &amp; <b>bold</b> <a href="/x?a=1&amp;b=2">l</a></p></div>',
      '<table class="t"><caption>c</caption><colgroup><col class="c" /></colgroup><thead><tr><th colspan="2">h</th></tr></thead><tbody><tr><td>{x}</td><td><table><tbody /></table></td></tr></tbody><tfoot /></table>',
      '<tr><td class="c">1</td><td /></tr>',
      "<td><b>x</b></td>",
      "<tbody><tr><td /></tr></tbody>",
      '<colgroup><col class="c" /></colgroup>',
      "<caption><b>c</b></caption>",
      "<ul><li>a<ul><li>b</li></ul></li><li /></ul>",
      "<dl><dt>t</dt><dd>d</dd><div><dt>x</dt></div></dl>",
      '<div><img src="a.png" alt="" /><br /><input type="text" name="n" placeholder="p" /><hr /></div>',
      "<div><input disabled required /><button hidden={true}>b</button><span aria-hidden={true} data-x={false} data-y={null} /></div>",
      '<p><span><b>a</b></span><a href="#">l</a><button>b</button><img alt="i" /></p>',
      "<h1><span>a</span></h1>",
      "<div> <b>x</b> 😀 </div>",
      '<pre>{"a\\nb"}</pre>',
      '<form action="/a" method="post"><fieldset><legend>l</legend><label for="x">x</label></fieldset></form>',
      "<li>item</li>",
    ];
    for (const source of sources) {
      expect(code(source)).toContain("_$pxhtml(");
      same(source, { x: "X", a: "A", b: "B" });
    }
  });

  it("keeps the builder for trees the parser would read differently", () => {
    const sources = [
      '<my-el class="a"><b /></my-el>',
      '<svg><path d="M0" /></svg>',
      "<select><option>a</option></select>",
      "<p><div>a</div></p>",
      "<p><span><ul><li /></ul></span></p>",
      '<a href="#"><span><a>x</a></span></a>',
      "<button><b><button>x</button></b></button>",
      "<form><div><form /></div></form>",
      "<h1><h2>x</h2></h1>",
      "<li><div><li>x</li></div></li>",
      "<dl><dt><dd>x</dd></dt></dl>",
      "<table><tr><td /></tr></table>",
      "<tr><div /></tr>",
      "<tbody>text<tr /></tbody>",
      "<div><td>x</td></div>",
      "<p><br>x</br></p>",
      '<pre>{"\\nx"}</pre>',
      '<p>a{"b"}</p>',
      '<p><b>{""}</b></p>',
      '<p>{"a\\0"}</p>',
      '<p>{"\\uD800"}</p>',
      "<p><b tabIndex={0} /></p>",
      '<p><input value="x" /></p>',
      '<p><b hidden="yes" /></p>',
      "<p><b id={true} /></p>",
      "<p><b id={false} /></p>",
      '<p><b is="x" /></p>',
      '<p><b class="a" className="b" /></p>',
      '<p><b data-x="a" data-x={false} /></p>',
      '<p><a href={"\\uD800"} /></p>',
    ];
    for (const source of sources) {
      const out = code(source);
      expect(out).toContain("_$pxtemplate(");
      expect(out).not.toContain("_$pxhtml(");
    }
  });
});
