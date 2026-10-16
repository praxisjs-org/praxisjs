// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StatefulComponent } from "@praxisjs/core";
import { setComponentAnchor } from "@praxisjs/core/internal";
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

abstract class AnchoredComponent extends StatefulComponent {
  constructor(anchor?: Comment) {
    super();
    setComponentAnchor(this, anchor);
  }
}

describe("@Style field decorator", () => {
  it("sets a CSS custom property on the container element after onMount", () => {
    const anchor = makeAnchor(container);

    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--accent")
      accent = "#3b82f6";
      render() { return null; }
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();

    expect(container.style.getPropertyValue("--accent")).toBe("#3b82f6");
  });

  it("updates CSS custom property reactively when field value changes", () => {
    const anchor = makeAnchor(container);

    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--color")
      color = "red";
      render() { return null; }
    }

    const inst = new Comp() as WithLifecycle & { color: string };
    inst.onMount?.();
    expect(container.style.getPropertyValue("--color")).toBe("red");

    inst.color = "blue";
    expect(container.style.getPropertyValue("--color")).toBe("blue");
  });

  it("removes the CSS custom property on unmount", () => {
    const anchor = makeAnchor(container);

    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--accent")
      accent = "red";
      render() { return null; }
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--accent")).toBe("red");

    inst.onUnmount?.();
    expect(container.style.getPropertyValue("--accent")).toBe("");
  });

  it("does not throw when anchor has no parentElement", () => {
    const anchor = document.createComment("[/Comp]");

    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--color")
      color = "red";
      render() { return null; }
    }

    const inst = new Comp() as WithLifecycle;
    expect(() => inst.onMount?.()).not.toThrow();
    expect(() => inst.onUnmount?.()).not.toThrow();
  });

  it("stops the reactive effect after onUnmount — further changes are silent", () => {
    const anchor = makeAnchor(container);

    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--val")
      val = "a";
      render() { return null; }
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

    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--size")
      size = 16;
      render() { return null; }
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--size")).toBe("16");
  });

  it("getter returns the current signal value", () => {
    const anchor = makeAnchor(container);

    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--size")
      size = "16px";
      render() { return null; }
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

    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--card-border-radius")
      radius = "12px";
      render() { return null; }
    }

    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--card-border-radius")).toBe("12px");
  });
});

describe("@Style — shared accessors and lifecycle", () => {
  it("instances share one accessor pair and keep independent values", () => {
    class Comp extends AnchoredComponent {
      @Style("--accent") accent = "red";
      render() { return null; }
    }
    const a = new Comp();
    const b = new Comp();
    const getter = (o: object) => Object.getOwnPropertyDescriptor(o, "accent")?.get;
    expect(getter(a)).toBe(getter(b));
    a.accent = "blue";
    expect(a.accent).toBe("blue");
    expect(b.accent).toBe("red");
  });

  it("runs the component's own onMount/onUnmount first", () => {
    const anchor = makeAnchor(container);
    const calls: string[] = [];
    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--accent") accent = "red";
      onMount() { calls.push(`mount:${container.style.getPropertyValue("--accent")}`); }
      onUnmount() { calls.push(`unmount:${container.style.getPropertyValue("--accent")}`); }
      render() { return null; }
    }
    const inst = new Comp();
    inst.onMount();
    inst.onUnmount();
    expect(calls).toEqual(["mount:", "unmount:red"]);
  });

  it("two @Style fields on one component chain their hooks", () => {
    const anchor = makeAnchor(container);
    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--a") a = "1px";
      @Style("--b") b = "2px";
      render() { return null; }
    }
    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    expect(container.style.getPropertyValue("--a")).toBe("1px");
    expect(container.style.getPropertyValue("--b")).toBe("2px");
    inst.onUnmount?.();
    expect(container.style.getPropertyValue("--a")).toBe("");
    expect(container.style.getPropertyValue("--b")).toBe("");
  });

  // Bug: the property was removed from the anchor's current parent, so a component whose anchor
  // was already detached at unmount left it on its old container.
  it("removes the property from the element it was set on, even after the anchor is detached", () => {
    const anchor = makeAnchor(container);
    class Comp extends AnchoredComponent {
      constructor() { super(anchor); }
      @Style("--accent") accent = "red";
      render() { return null; }
    }
    const inst = new Comp() as WithLifecycle;
    inst.onMount?.();
    anchor.remove();
    inst.onUnmount?.();
    expect(container.style.getPropertyValue("--accent")).toBe("");
  });
});
