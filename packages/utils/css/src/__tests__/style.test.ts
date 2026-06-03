// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Style } from "../decorators/style";

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

/** Attaches an anchor comment to the element, simulating what the runtime does. */
function makeAnchor(parent: HTMLElement): Comment {
  const anchor = document.createComment("[/Comp]");
  parent.appendChild(anchor);
  return anchor;
}

type WithLifecycle = { onMount?(): void; onUnmount?(): void };

describe("@Style field decorator", () => {
  it("sets a CSS custom property on the container element after onMount", () => {
    const anchor = makeAnchor(container);

    class Comp {
      _anchor = anchor;
      @Style("--accent")
      accent = "#3b82f6";
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();

    expect(container.style.getPropertyValue("--accent")).toBe("#3b82f6");
  });

  it("updates CSS custom property reactively when field value changes", () => {
    const anchor = makeAnchor(container);

    class Comp {
      _anchor = anchor;
      @Style("--color")
      color = "red";
    }

    const inst = new Comp() as WithLifecycle & { color: string };
    inst.onMount?.();
    expect(container.style.getPropertyValue("--color")).toBe("red");

    inst.color = "blue";
    expect(container.style.getPropertyValue("--color")).toBe("blue");
  });

  it("removes the CSS custom property on unmount", () => {
    const anchor = makeAnchor(container);

    class Comp {
      _anchor = anchor;
      @Style("--accent")
      accent = "red";
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--accent")).toBe("red");

    inst.onUnmount?.();
    expect(container.style.getPropertyValue("--accent")).toBe("");
  });

  it("does not throw when _anchor has no parentElement", () => {
    const anchor = document.createComment("[/Comp]");

    class Comp {
      _anchor = anchor;
      @Style("--color")
      color = "red";
    }

    const inst = new Comp() as WithLifecycle;
    expect(() => inst.onMount?.()).not.toThrow();
    expect(() => inst.onUnmount?.()).not.toThrow();
  });

  it("stops the reactive effect after onUnmount — further changes are silent", () => {
    const anchor = makeAnchor(container);

    class Comp {
      _anchor = anchor;
      @Style("--val")
      val = "a";
    }

    const inst = new Comp() as WithLifecycle & { val: string };
    inst.onMount?.();
    expect(container.style.getPropertyValue("--val")).toBe("a");

    inst.onUnmount?.();
    inst.val = "b";
    expect(container.style.getPropertyValue("--val")).toBe("");
  });

  it("supports numeric values (converted to string)", () => {
    const anchor = makeAnchor(container);

    class Comp {
      _anchor = anchor;
      @Style("--size")
      size = 16;
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--size")).toBe("16");
  });

  it("getter returns the current signal value", () => {
    const anchor = makeAnchor(container);

    class Comp {
      _anchor = anchor;
      @Style("--size")
      size = "16px";
    }

    const inst = new Comp() as WithLifecycle & { size: string | number };
    // getter before mount
    expect(inst.size).toBe("16px");

    inst.onMount?.();
    inst.size = "24px";
    // getter after reactive update
    expect(inst.size).toBe("24px");
  });

  it("supports multi-word custom property names", () => {
    const anchor = makeAnchor(container);

    class Comp {
      _anchor = anchor;
      @Style("--card-border-radius")
      radius = "12px";
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--card-border-radius")).toBe("12px");
  });
});
