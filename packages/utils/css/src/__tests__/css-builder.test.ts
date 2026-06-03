import { describe, expect, it } from "vitest";
import { createCSSBuilder, isCSSBuilder } from "../builder/css-builder";

describe("createCSSBuilder()", () => {
  it("serialises a flat property object to CSS declarations", () => {
    const css = createCSSBuilder({ display: "flex", gap: "12px", padding: "16px" });
    expect(String(css)).toBe("display: flex;\ngap: 12px;\npadding: 16px;");
  });

  it("converts camelCase properties to kebab-case", () => {
    const css = createCSSBuilder({ flexDirection: "column", borderRadius: "8px", fontSize: "1rem" });
    expect(String(css)).toContain("flex-direction: column;");
    expect(String(css)).toContain("border-radius: 8px;");
    expect(String(css)).toContain("font-size: 1rem;");
  });

  it("skips null and undefined values", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const css = createCSSBuilder({ display: "flex", color: undefined as any });
    expect(String(css)).toBe("display: flex;");
  });

  it("returns empty string when no properties are given", () => {
    expect(String(createCSSBuilder({}))).toBe("");
  });

  it("accepts CSS custom properties (--var)", () => {
    const css = createCSSBuilder({ "--accent": "#3b82f6" } as Parameters<typeof createCSSBuilder>[0]);
    expect(String(css)).toContain("--accent: #3b82f6;");
  });
});

describe("CSSBuilder — pseudo-state nesting", () => {
  it(".hover() adds &:hover block", () => {
    const css = createCSSBuilder({ display: "flex" }).hover({ opacity: 0.9 });
    const out = String(css);
    expect(out).toContain("display: flex;");
    expect(out).toContain("&:hover {");
    expect(out).toContain("  opacity: 0.9;");
  });

  it(".focus() adds &:focus block", () => {
    const out = String(createCSSBuilder({ color: "red" }).focus({ outline: "2px solid blue" }));
    expect(out).toContain("&:focus {");
    expect(out).toContain("  outline: 2px solid blue;");
  });

  it(".focusWithin() adds &:focus-within block", () => {
    expect(String(createCSSBuilder({}).focusWithin({ color: "red" }))).toContain("&:focus-within {");
  });

  it(".focusVisible() adds &:focus-visible block", () => {
    expect(String(createCSSBuilder({}).focusVisible({ outline: "none" }))).toContain("&:focus-visible {");
  });

  it(".active() adds &:active block", () => {
    expect(String(createCSSBuilder({}).active({ transform: "scale(0.98)" }))).toContain("&:active {");
  });

  it(".disabled() adds &:disabled + aria-disabled block", () => {
    const out = String(createCSSBuilder({}).disabled({ opacity: 0.4 }));
    expect(out).toContain("&:disabled");
    expect(out).toContain("aria-disabled");
  });

  it(".checked() adds &:checked block", () => {
    expect(String(createCSSBuilder({}).checked({ background: "blue" }))).toContain("&:checked {");
  });

  it(".placeholder() adds &::placeholder block", () => {
    expect(String(createCSSBuilder({}).placeholder({ color: "#999" }))).toContain("&::placeholder {");
  });

  it(".first() adds &:first-child block", () => {
    expect(String(createCSSBuilder({}).first({ marginTop: 0 }))).toContain("&:first-child {");
  });

  it(".last() adds &:last-child block", () => {
    expect(String(createCSSBuilder({}).last({ marginBottom: 0 }))).toContain("&:last-child {");
  });

  it(".nthChild() adds &:nth-child(n) block", () => {
    expect(String(createCSSBuilder({}).nthChild("2n+1", { background: "#f0f0f0" }))).toContain("&:nth-child(2n+1) {");
  });

  it(".not() adds &:not(selector) block", () => {
    expect(String(createCSSBuilder({}).not(".active", { opacity: 0.5 }))).toContain("&:not(.active) {");
  });
});

describe("CSSBuilder — at-rule nesting", () => {
  it(".media() adds @media (query) block", () => {
    const out = String(createCSSBuilder({ display: "flex" }).media("max-width: 640px", { flexDirection: "column" }));
    expect(out).toContain("@media (max-width: 640px) {");
    expect(out).toContain("  flex-direction: column;");
  });

  it(".container() adds @container (query) block", () => {
    const out = String(createCSSBuilder({}).container("min-width: 400px", { padding: "16px" }));
    expect(out).toContain("@container (min-width: 400px) {");
  });

  it(".on() adds any arbitrary selector or at-rule", () => {
    const out = String(createCSSBuilder({}).on("&::before", { content: '""', display: "block" }));
    expect(out).toContain("&::before {");
    expect(out).toContain("  content: \"\";");
  });
});

describe("CSSBuilder — chaining", () => {
  it("chains multiple nesting calls correctly", () => {
    const out = String(
      createCSSBuilder({ display: "flex" })
        .hover({ opacity: 0.9 })
        .focus({ outline: "2px solid blue" })
        .media("max-width: 640px", { flexDirection: "column" }),
    );
    expect(out).toContain("display: flex;");
    expect(out).toContain("&:hover {");
    expect(out).toContain("&:focus {");
    expect(out).toContain("@media (max-width: 640px) {");
  });

  it("each chained call returns the same builder (fluent pattern)", () => {
    const b1 = createCSSBuilder({ display: "flex" });
    const b2 = b1.hover({ opacity: 0.9 });
    expect(b1).toBe(b2);
  });

  it("skips nested block when props are empty", () => {
    const out = String(createCSSBuilder({ display: "flex" }).hover({}));
    expect(out).not.toContain("&:hover");
  });
});

describe("CSSBuilder — pseudo-elements", () => {
  it(".before() adds &::before block", () => {
    expect(String(createCSSBuilder({}).before({ content: '""', display: "block" }))).toContain("&::before {");
  });
  it(".after() adds &::after block", () => {
    expect(String(createCSSBuilder({}).after({ content: '""' }))).toContain("&::after {");
  });
  it(".selection() adds &::selection block", () => {
    expect(String(createCSSBuilder({}).selection({ background: "blue" }))).toContain("&::selection {");
  });
  it(".firstLine() adds &::first-line block", () => {
    expect(String(createCSSBuilder({}).firstLine({ fontWeight: "bold" }))).toContain("&::first-line {");
  });
  it(".firstLetter() adds &::first-letter block", () => {
    expect(String(createCSSBuilder({}).firstLetter({ fontSize: "2em" }))).toContain("&::first-letter {");
  });
  it(".marker() adds &::marker block", () => {
    expect(String(createCSSBuilder({}).marker({ color: "red" }))).toContain("&::marker {");
  });
  it(".backdrop() adds &::backdrop block", () => {
    expect(String(createCSSBuilder({}).backdrop({ background: "rgba(0,0,0,0.5)" }))).toContain("&::backdrop {");
  });
});

describe("CSSBuilder — form pseudo-classes", () => {
  it(".enabled() adds &:enabled block", () => {
    expect(String(createCSSBuilder({}).enabled({ opacity: 1 }))).toContain("&:enabled {");
  });
  it(".indeterminate() adds &:indeterminate block", () => {
    expect(String(createCSSBuilder({}).indeterminate({ opacity: 0.5 }))).toContain("&:indeterminate {");
  });
  it(".required() adds &:required block", () => {
    expect(String(createCSSBuilder({}).required({ borderColor: "red" }))).toContain("&:required {");
  });
  it(".optional() adds &:optional block", () => {
    expect(String(createCSSBuilder({}).optional({ borderColor: "gray" }))).toContain("&:optional {");
  });
  it(".valid() adds &:valid block", () => {
    expect(String(createCSSBuilder({}).valid({ borderColor: "green" }))).toContain("&:valid {");
  });
  it(".invalid() adds &:invalid block", () => {
    expect(String(createCSSBuilder({}).invalid({ borderColor: "red" }))).toContain("&:invalid {");
  });
  it(".readOnly() adds &:read-only block", () => {
    expect(String(createCSSBuilder({}).readOnly({ opacity: 0.7 }))).toContain("&:read-only {");
  });
  it(".visited() adds &:visited block", () => {
    expect(String(createCSSBuilder({}).visited({ color: "purple" }))).toContain("&:visited {");
  });
  it(".target() adds &:target block", () => {
    expect(String(createCSSBuilder({}).target({ outline: "2px solid blue" }))).toContain("&:target {");
  });
  it(".empty() adds &:empty block", () => {
    expect(String(createCSSBuilder({}).empty({ display: "none" }))).toContain("&:empty {");
  });
});

describe("CSSBuilder — relational pseudo-classes", () => {
  it(".has() adds &:has(selector) block", () => {
    expect(String(createCSSBuilder({}).has(".active", { fontWeight: "bold" }))).toContain("&:has(.active) {");
  });
  it(".is() adds &:is(selector) block", () => {
    expect(String(createCSSBuilder({}).is("h1, h2", { lineHeight: 1.2 }))).toContain("&:is(h1, h2) {");
  });
  it(".where() adds &:where(selector) block", () => {
    expect(String(createCSSBuilder({}).where("a, button", { cursor: "pointer" }))).toContain("&:where(a, button) {");
  });
});

describe("CSSBuilder — @supports", () => {
  it(".supports() adds @supports (condition) block", () => {
    const out = String(createCSSBuilder({ display: "flex" }).supports("display: grid", { display: "grid" }));
    expect(out).toContain("@supports (display: grid) {");
    expect(out).toContain("  display: grid;");
  });
});

describe("isCSSBuilder()", () => {
  it("returns true for a CSSBuilder instance", () => {
    expect(isCSSBuilder(createCSSBuilder({ display: "flex" }))).toBe(true);
  });

  it("returns false for plain strings", () => {
    expect(isCSSBuilder("display: flex;")).toBe(false);
  });

  it("returns false for null and undefined", () => {
    expect(isCSSBuilder(null)).toBe(false);
    expect(isCSSBuilder(undefined)).toBe(false);
  });

  it("returns false for plain objects", () => {
    expect(isCSSBuilder({ display: "flex" })).toBe(false);
  });
});
