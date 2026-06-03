import { globalStyle } from "@praxisjs/css";

// ─── Resets ───────────────────────────────────────────────────────────────────

globalStyle(_css => `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
`);

// ─── Base elements ────────────────────────────────────────────────────────────

globalStyle(_css => `
body {
  font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: var(--color-text);
  background-color: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}
strong { color: var(--color-text); font-weight: 600; }
code {
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 0.875em;
  color: var(--color-brand);
  background-color: var(--color-brand-soft);
  padding: 0.15em 0.4em;
  border-radius: var(--radius-sm);
}
`);

// ─── Button (global element style) ───────────────────────────────────────────

globalStyle(_css => `
button {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; padding: 10px 24px; font-size: 0.875rem; font-weight: 600;
  font-family: inherit; border-radius: var(--radius-md);
  border: 1px solid transparent; cursor: pointer;
  transition: background-color 0.15s, box-shadow 0.15s, transform 0.1s;
  background-color: var(--color-brand); color: #fff;
  box-shadow: 0 2px 8px rgba(109, 91, 189, 0.3);
}
button:hover { background-color: color-mix(in srgb, var(--color-brand) 85%, white); box-shadow: 0 4px 14px rgba(109, 91, 189, 0.4); }
button:active { transform: scale(0.97); }
button:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 2px; }
button.secondary {
  background-color: var(--color-bg-soft); color: var(--color-text);
  border-color: var(--color-border); box-shadow: none;
}
button.secondary:hover { background-color: var(--color-bg-alt); }
button.tag-remove {
  all: unset; cursor: pointer; font-size: 1rem; line-height: 1;
  color: var(--color-text-muted); padding: 0 2px;
}
button.tag-remove:hover { color: var(--color-brand); }
`);

// ─── Prose (blog post body) ───────────────────────────────────────────────────

globalStyle(_css => `
.prose h1,.prose h2,.prose h3 { color: var(--color-text); margin: 1.4em 0 .5em; line-height: 1.3; }
.prose h1 { font-size: 1.6rem; }
.prose h2 { font-size: 1.2rem; }
.prose h3 { font-size: 1rem; }
.prose p { margin: 0 0 1em; }
.prose ul,.prose ol { padding-left: 1.4em; margin: 0 0 1em; }
.prose li { margin-bottom: .3em; }
.prose a { color: var(--color-brand); text-decoration: none; }
.prose a:hover { text-decoration: underline; }
.prose code { background: var(--color-bg-alt); border-radius: 4px; padding: 1px 5px; font-size: .84em; }
.prose pre {
  background: var(--color-bg-alt); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 14px 16px; overflow-x: auto;
  font-size: .84rem; margin: 0 0 1.2em;
}
.prose pre code { background: none; padding: 0; }
.prose table { border-collapse: collapse; width: 100%; margin: 0 0 1.2em; font-size: .87rem; }
.prose th,.prose td { text-align: left; padding: 6px 12px; border: 1px solid var(--color-border); }
.prose th { background: var(--color-bg-alt); font-weight: 600; }
`);
