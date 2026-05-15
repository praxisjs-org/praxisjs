import React, { useEffect, useRef, useState } from "react";
import { addons, types, useParameter } from "storybook/internal/manager-api";

// ─── One Dark theme ──────────────────────────────────────────────────────────

const CSS = `
.prax-panel {
  background: #282c34;
  color: #abb2bf;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.65;
  margin: 0;
  padding: 20px 24px;
  white-space: pre;
  tab-size: 2;
  box-sizing: border-box;
}
.prax-panel .kw { color: #c678dd; }
.prax-panel .dc { color: #e5c07b; font-weight: 600; }
.prax-panel .st { color: #98c379; }
.prax-panel .cm { color: #5c6370; font-style: italic; }
.prax-panel .nm { color: #e5c07b; }
.prax-panel .fn { color: #61afef; }
.prax-panel .nb { color: #d19a66; }
.prax-panel .rx { color: #56b6c2; }
.prax-panel .op { color: #abb2bf; }
.prax-panel .no-src {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #5c6370;
  font-family: sans-serif;
  font-size: 13px;
}
`;

// ─── Tokenizer ────────────────────────────────────────────────────────────────

const KEYWORDS = new Set([
  "import","export","from","default","class","extends","implements",
  "interface","type","enum","const","let","var","function","async","await",
  "return","if","else","for","while","do","switch","case","break","continue",
  "new","this","super","static","public","private","protected","readonly",
  "abstract","declare","namespace","module","as","typeof","instanceof","in",
  "of","null","undefined","true","false","void","never","any","unknown",
  "string","number","boolean","object","infer","keyof","satisfies",
]);

const PATTERNS = [
  // multi-line comment
  { type: "cm", re: /^(\/\*[\s\S]*?\*\/)/ },
  // single-line comment
  { type: "cm", re: /^(\/\/[^\n]*)/ },
  // template literal
  { type: "st", re: /^(`(?:\\[\s\S]|[^`\\])*`)/ },
  // string
  { type: "st", re: /^((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'))/ },
  // decorator
  { type: "dc", re: /^(@[A-Za-z_$][A-Za-z0-9_$]*)/ },
  // identifier — classified below
  { type: "id", re: /^([A-Za-z_$][A-Za-z0-9_$]*)/ },
  // number
  { type: "nb", re: /^(0x[\da-fA-F]+|\d+(?:\.\d+)?)/ },
  // single char fallback
  { type: null, re: /^([\s\S])/ },
];

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tokenize(code) {
  let out = "";
  let i = 0;
  while (i < code.length) {
    const slice = code.slice(i);
    let matched = false;
    for (const { type, re } of PATTERNS) {
      const m = slice.match(re);
      if (!m) continue;
      const text = m[1];
      i += text.length;
      if (type === null) { out += esc(text); matched = true; break; }
      if (type === "id") {
        if (KEYWORDS.has(text)) {
          out += `<span class="kw">${esc(text)}</span>`;
        } else if (/^[A-Z]/.test(text)) {
          out += `<span class="nm">${esc(text)}</span>`;
        } else if (code[i] === "(") {
          out += `<span class="fn">${esc(text)}</span>`;
        } else {
          out += esc(text);
        }
        matched = true;
        break;
      }
      out += `<span class="${type}">${esc(text)}</span>`;
      matched = true;
      break;
    }
    if (!matched) { out += esc(code[i]); i++; }
  }
  return out;
}

// ─── Panel component ──────────────────────────────────────────────────────────

const PANEL_ID = "praxisjs/source";

function SourcePanel({ active }) {
  const storySource = useParameter("storySource", {});
  const source = storySource?.source ?? "";
  const rootRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (document.getElementById("prax-panel-css")) return;
    const el = document.createElement("style");
    el.id = "prax-panel-css";
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  // Observe the parent panel container to get its height
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    ro.observe(parent);
    setHeight(parent.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [active]);

  if (!active) return null;

  const wrapperStyle = {
    width: "100%",
    height: height || "auto",
    overflow: "auto",
  };

  if (!source) {
    return (
      <div ref={rootRef} style={wrapperStyle}>
        <pre className="prax-panel">
          <span className="no-src">No source available for this story.</span>
        </pre>
      </div>
    );
  }

  return (
    <div ref={rootRef} style={wrapperStyle}>
      <pre
        className="prax-panel"
        dangerouslySetInnerHTML={{ __html: tokenize(source) }}
      />
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────

addons.register(PANEL_ID, () => {
  addons.add(`${PANEL_ID}/panel`, {
    type: types.PANEL,
    title: "Code",
    render: ({ active }) => (
      <SourcePanel key={PANEL_ID} active={active} />
    ),
  });
});
