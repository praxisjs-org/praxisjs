import { describe, it, expect } from "vitest";
import { TokenSheet, tokenVars } from "../tokens/token-sheet";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

class AppTokens extends TokenSheet {
  colorPrimary!:   string;
  colorBg!:        string;
  spaceMd!:        string;
  radiusFull!:     string;
}

class LightTheme extends AppTokens {
  colorPrimary = "#3b82f6";
  colorBg      = "#ffffff";
  spaceMd      = "16px";
  radiusFull   = "9999px";
}

class DarkTheme extends LightTheme {
  colorPrimary = "#60a5fa";
  colorBg      = "#0f172a";
}

// ─── TokenSheet static refs ───────────────────────────────────────────────────

const asRecord = (cls: unknown) => cls as Record<string, unknown>;

describe("TokenSheet — static CSS var references", () => {
  it("camelCase key → var(--kebab-case)", () => {
    expect(asRecord(AppTokens).colorPrimary).toBe("var(--color-primary)");
  });

  it("multi-capital camelCase → correct kebab", () => {
    class T extends TokenSheet { spacingXxLarge!: string; }
    expect(asRecord(T).spacingXxLarge).toBe("var(--spacing-xx-large)");
  });

  it("single-word key → var(--word)", () => {
    class T extends TokenSheet { size!: string; }
    expect(asRecord(T).size).toBe("var(--size)");
  });

  it("subclass inherits static refs from the skeleton", () => {
    expect(asRecord(LightTheme).colorPrimary).toBe("var(--color-primary)");
    expect(asRecord(DarkTheme).colorPrimary).toBe("var(--color-primary)");
  });

  it("built-in static props are not intercepted", () => {
    expect(typeof (AppTokens as unknown as { prototype: unknown }).prototype).toBe("object");
    expect(typeof (AppTokens as unknown as { name: unknown }).name).toBe("string");
  });

  it("props starting with _ are not intercepted", () => {
    expect(asRecord(AppTokens)._internal).toBeUndefined();
  });

  it("props starting with $ are not intercepted", () => {
    expect(asRecord(AppTokens).$root).toBeUndefined();
  });

  it("different token names produce different var strings", () => {
    expect(asRecord(AppTokens).colorPrimary).not.toBe(asRecord(AppTokens).colorBg);
  });
});

// ─── tokenVars ────────────────────────────────────────────────────────────────

describe("tokenVars()", () => {
  it("returns CSS var refs for all declared fields", () => {
    const t = tokenVars(AppTokens);
    expect(t.colorPrimary).toBe("var(--color-primary)");
    expect(t.colorBg).toBe("var(--color-bg)");
    expect(t.spaceMd).toBe("var(--space-md)");
    expect(t.radiusFull).toBe("var(--radius-full)");
  });

  it("works on theme subclasses (inherits skeleton fields)", () => {
    const t = tokenVars(DarkTheme);
    expect(t.colorPrimary).toBe("var(--color-primary)");
    expect(t.colorBg).toBe("var(--color-bg)");
  });

  it("is the same object reference as the class (no extra allocation)", () => {
    expect(tokenVars(AppTokens)).toBe(AppTokens as unknown);
  });
});
