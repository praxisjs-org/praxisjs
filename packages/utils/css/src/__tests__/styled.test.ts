// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatefulComponent } from "@praxisjs/core";
import { setComponentAnchor } from "@praxisjs/core/internal";
import { Component } from "@praxisjs/decorators";
import { Param } from "../decorators/param";
import { ReactiveStylesheet, Stylesheet } from "../base/stylesheet";
import { Styled } from "../decorators/styled";

type WithLifecycle = { onMount?(): void; onUnmount?(): void };

beforeEach(() => {
  document
    .head
    .querySelectorAll("style[data-praxis-hash]")
    .forEach((el) => el.remove());
});

afterEach(() => {
  document
    .head
    .querySelectorAll("style[data-praxis-hash]")
    .forEach((el) => el.remove());
});

// ─── CSS class fields ($-prefixed) ────────────────────────────────────────────

class BtnStyle extends Stylesheet {
  $base    = `display: inline-flex; padding: 8px 16px;`;
  $primary = `background: var(--accent); color: white;`;
}

describe("@Styled — $-prefixed CSS class fields", () => {
  it("transforms $-fields to scoped class names", () => {
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    const { $btn } = new Comp();
    expect($btn.$base).toMatch(/^prx-base-/);
    expect($btn.$primary).toMatch(/^prx-primary-/);
  });

  it("class names are distinct for distinct CSS", () => {
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    const { $btn } = new Comp();
    expect($btn.$base).not.toBe($btn.$primary);
  });

  it("same CSS content produces the same hash suffix across different keys", () => {
    class SA extends Stylesheet { $x = `color: red;`; }
    class SB extends Stylesheet { $y = `color: red;`; }

    const hashA = new (class { @Styled(SA) $a!: SA; })().$a.$x.split("-").pop();
    const hashB = new (class { @Styled(SB) $b!: SB; })().$b.$y.split("-").pop();
    expect(hashA).toBe(hashB);
  });

  it("caches the class map — same object reference across instances", () => {
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    expect(new Comp().$btn).toBe(new Comp().$btn);
  });

  it("injects a style element into document.head eagerly at decoration time", () => {
    // Before any class definition: no style element
    expect(document.head.querySelector("style[data-praxis-hash]")).toBeNull();

    // Defining a class with @Styled injects immediately (before any mount)
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    expect(document.head.querySelector("style[data-praxis-hash]")).not.toBeNull();
    // Style is present even before instantiation or mount
    void Comp;
  });

  it("style is present before onMount is called", () => {
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    // Style injected at decoration time — no mount needed
    expect(document.head.querySelector("style[data-praxis-hash]")).not.toBeNull();
    const inst = new Comp() as WithLifecycle;
    // Still present before mount
    expect(document.head.querySelector("style[data-praxis-hash]")).not.toBeNull();
    inst.onMount?.();
    expect(document.head.querySelector("style[data-praxis-hash]")).not.toBeNull();
  });

  it("injected CSS contains the generated class names", () => {
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    const css = document.head.querySelector("style[data-praxis-hash]")?.textContent ?? "";
    expect(css).toContain(new Comp().$btn.$base);
  });

  it("reference-counts — injects once for multiple instances", () => {
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    const i1 = new Comp() as WithLifecycle;
    const i2 = new Comp() as WithLifecycle;
    i1.onMount?.();
    i2.onMount?.();
    expect(document.head.querySelectorAll("style[data-praxis-hash]").length).toBe(1);
  });

  it("style persists after all instances unmount (decoration-time base reference)", () => {
    // The eager injection at decoration time holds a permanent reference.
    // Unmounting all instances decrements their ref-count but does not remove the style.
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    inst.onUnmount?.();
    expect(document.head.querySelector("style[data-praxis-hash]")).not.toBeNull();
  });

  it("keeps style when one of two instances unmounts", () => {
    class Comp {
      @Styled(BtnStyle) $btn!: BtnStyle;
    }

    const i1 = new Comp() as WithLifecycle;
    const i2 = new Comp() as WithLifecycle;
    i1.onMount?.();
    i2.onMount?.();

    i1.onUnmount?.();
    expect(document.head.querySelector("style[data-praxis-hash]")).not.toBeNull();

    i2.onUnmount?.();
    expect(document.head.querySelector("style[data-praxis-hash]")).not.toBeNull();
  });

  it("multiple @Styled fields inject separate stylesheets", () => {
    class SA extends Stylesheet { $foo = `color: tomato;`; }
    class SB extends Stylesheet { $bar = `color: steelblue;`; }

    class Comp {
      @Styled(SA) $a!: SA;
      @Styled(SB) $b!: SB;
    }

    // Both injected at decoration time
    expect(document.head.querySelectorAll("style[data-praxis-hash]").length).toBe(2);

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(document.head.querySelectorAll("style[data-praxis-hash]").length).toBe(2);
    inst.onUnmount?.();
    expect(document.head.querySelectorAll("style[data-praxis-hash]").length).toBe(2);
  });

  it("works with @Component() in the class stack", () => {
    @Component()
    class Card extends StatefulComponent {
      @Styled(BtnStyle) $btn!: BtnStyle;
      render() { return document.createElement("div"); }
    }

    const inst = new Card();
    expect(inst.$btn.$base).toMatch(/^prx-base-/);
  });

  it("skips $-prefixed fields that are neither string nor CSSBuilder", () => {
    class S extends Stylesheet {
      $root = 42 as unknown as string;
      $base = `display: flex;`;
    }
    class Comp {
      @Styled(S) $s!: S;
    }
    const inst = new Comp();
    expect((inst.$s as unknown as Record<string, unknown>).$root).toBeUndefined();
    expect(inst.$s.$base).toMatch(/^prx-base-/);
  });

  it("processes CSSBuilder fields (this.css({}))", () => {
    class S extends Stylesheet {
      $root = this.css({ display: "flex", gap: "12px" })
        .hover({ opacity: 0.9 });
    }
    class Comp {
      @Styled(S) $s!: S;
    }
    const inst = new Comp() as WithLifecycle & Comp;
    expect(inst.$s.$root).toMatch(/^prx-root-/);

    const css = document.head.querySelector("style[data-praxis-hash]")?.textContent ?? "";
    expect(css).toContain("display: flex;");
    expect(css).toContain("&:hover");
    inst.onUnmount?.();
  });
});

// ─── @Param() reactive CSS vars ─────────────────────────────────────────────────

function makeAnchor(parent: HTMLElement): Comment {
  const anchor = document.createComment("[/Comp]");
  parent.appendChild(anchor);
  return anchor;
}

describe("@Param — reactive CSS custom properties", () => {
  it("@Param() field exposes a getter/setter on the stylesheet object", () => {
    class S extends ReactiveStylesheet {
      @Param() color = "#3b82f6";
      $root = `background: var(--color);`;
    }

    class Comp extends StatefulComponent {
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }

    const inst = new Comp();
    expect(inst.$s.color).toBe("#3b82f6");

    inst.$s.color = "red";
    expect(inst.$s.color).toBe("red");
  });

  it("sets the CSS var on the element when onMount fires", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    class S extends ReactiveStylesheet {
      @Param() accent = "#3b82f6";
      $root = `color: var(--accent);`;
    }

    class Comp extends StatefulComponent {
      constructor() {
        super();
        setComponentAnchor(this, makeAnchor(container));
      }
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();

    expect(container.style.getPropertyValue("--accent")).toBe("#3b82f6");
    container.remove();
  });

  it("updates the CSS var reactively when the field is set", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    class S extends ReactiveStylesheet {
      @Param() color = "blue";
      $root = `color: var(--color);`;
    }

    class Comp extends StatefulComponent {
      constructor() {
        super();
        setComponentAnchor(this, makeAnchor(container));
      }
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }

    const inst = new Comp() as WithLifecycle & Comp;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--color")).toBe("blue");

    inst.$s.color = "red";
    expect(container.style.getPropertyValue("--color")).toBe("red");

    container.remove();
  });

  it("removes CSS vars on onUnmount", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    class S extends ReactiveStylesheet {
      @Param() size = "16px";
      $root = `font-size: var(--size);`;
    }

    class Comp extends StatefulComponent {
      constructor() {
        super();
        setComponentAnchor(this, makeAnchor(container));
      }
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--size")).toBe("16px");

    inst.onUnmount?.();
    expect(container.style.getPropertyValue("--size")).toBe("");

    container.remove();
  });

  it("each instance gets independent signal state", () => {
    const c1 = document.createElement("div");
    const c2 = document.createElement("div");
    document.body.append(c1, c2);

    class S extends ReactiveStylesheet {
      @Param() color = "blue";
      $root = `color: var(--color);`;
    }

    class Comp extends StatefulComponent {
      constructor(anchor: Comment) {
        super();
        setComponentAnchor(this, anchor);
      }
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }

    const i1 = new Comp(makeAnchor(c1)) as WithLifecycle & Comp;
    const i2 = new Comp(makeAnchor(c2)) as WithLifecycle & Comp;
    i1.onMount?.();
    i2.onMount?.();

    i1.$s.color = "red";
    expect(c1.style.getPropertyValue("--color")).toBe("red");
    expect(c2.style.getPropertyValue("--color")).toBe("blue");

    c1.remove();
    c2.remove();
  });

  it("Stylesheet with only @Param() fields (no $ CSS) — no style element injected", () => {
    class S extends ReactiveStylesheet {
      @Param() color = "red";
    }
    class Comp extends StatefulComponent {
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }
    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(document.head.querySelector("style[data-praxis-hash]")).toBeNull();
    inst.onUnmount?.();
  });

  it("@Param() field with non-string/non-number value is skipped (defensive)", () => {
    class S extends ReactiveStylesheet {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      @(Param() as any) items = [] as unknown as string;
      $root = `display: flex;`;
    }
    class Comp extends StatefulComponent {
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }
    const inst = new Comp();
    expect(inst.$s.$root).toMatch(/^prx-root-/);
    expect((inst.$s as unknown as Record<string, unknown>).items).toBeUndefined();
  });

  it("non-$ non-@Param() fields in Stylesheet are silently ignored", () => {
    class S extends ReactiveStylesheet {
      $root = `display: flex;`;
      description = "a plain field that should be skipped";
    }
    class Comp extends StatefulComponent {
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }
    const inst = new Comp();
    expect(inst.$s.$root).toMatch(/^prx-root-/);
    expect((inst.$s as unknown as Record<string, unknown>).description).toBeUndefined();
  });

  it("two @Param() fields on the same class — PARAM_META entry reused", () => {
    class S extends ReactiveStylesheet {
      @Param() color  = "blue";
      @Param() radius = "8px";
      $root = `color: var(--color); border-radius: var(--radius);`;
    }
    class Comp extends StatefulComponent {
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }
    const inst = new Comp();
    expect(inst.$s.color).toBe("blue");
    expect(inst.$s.radius).toBe("8px");
  });

  it("onUnmount removes CSS vars from element when el is present", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    class S extends ReactiveStylesheet {
      @Param() color = "red";
      $root = `color: var(--color);`;
    }
    class Comp extends StatefulComponent {
      constructor() {
        super();
        setComponentAnchor(this, makeAnchor(container));
      }
      @Styled(S) $s!: S;
      render() { return document.createElement("div"); }
    }
    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--color")).toBe("red");
    inst.onUnmount?.();
    expect(container.style.getPropertyValue("--color")).toBe("");
    container.remove();
  });

  it("@Param() cannot be applied outside ReactiveStylesheet — enforced at TypeScript level", () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dec = (Param as any);
      const fakeCtx = {
        name: "foo",
        addInitializer(fn: () => void) { fn.call({ constructor: class {} }); },
      };
      dec(undefined, fakeCtx);
    }).not.toThrow();
  });
});
