import { describe, it, expect } from "vitest";

import { RootComponent } from "../component/base";
import {
  getComponentAnchor,
  getComponentDefault,
  getComponentDefaults,
  getComponentProps,
  getComponentRawProp,
  isComponentMounted,
  isStateDirty,
  markStateDirty,
  setComponentAnchor,
  setComponentDefault,
  setComponentMounted,
  setComponentProps,
  setStateDirty,
} from "../component/internals";
import { StatefulComponent } from "../component/stateful";
import { StatelessComponent } from "../component/stateless";

class ConcreteRoot extends RootComponent<{ name: string }> {
  render() {
    return null;
  }
}

class ConcreteStateful extends StatefulComponent {
  render() {
    return null;
  }
}

describe("RootComponent", () => {
  it("stores props in component internals", () => {
    const c = new ConcreteRoot({ name: "Alice" });
    expect((getComponentProps(c) as { name: string }).name).toBe("Alice");
  });

  it("does not expose old underscore internals as own properties", () => {
    const c = new ConcreteRoot({ name: "Alice" });
    expect(Object.prototype.hasOwnProperty.call(c, "_rawProps")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(c, "_mounted")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(c, "_anchor")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(c, "_setProps")).toBe(false);
  });

  it("mounted starts as false", () => {
    const c = new ConcreteRoot({ name: "" });
    expect(isComponentMounted(c)).toBe(false);
  });

  it("anchor starts as undefined", () => {
    const c = new ConcreteRoot({ name: "" });
    expect(getComponentAnchor(c)).toBeUndefined();
  });

  it("defaults to empty object when no props given", () => {
    const c = new ConcreteRoot();
    expect(getComponentProps(c)).toEqual({});
  });
});

describe("StatefulComponent", () => {
  it("defaults start as empty object", () => {
    const c = new ConcreteStateful();
    expect(getComponentDefaults(c)).toEqual({});
  });

  it("stateDirty starts as false", () => {
    const c = new ConcreteStateful();
    expect(isStateDirty(c)).toBe(false);
  });

  it("setComponentProps replaces raw props contents", () => {
    const c = new ConcreteStateful({ x: 1 });
    setComponentProps(c, { y: 2 });
    const props = getComponentProps(c) as Record<string, unknown>;
    expect(props.x).toBeUndefined();
    expect(props.y).toBe(2);
  });

  it("updates anchor, mounted, defaults, and dirty state through helpers", () => {
    const c = new ConcreteStateful();
    const anchor = {} as Comment;

    setComponentAnchor(c, anchor);
    setComponentMounted(c, true);
    setComponentDefault(c, "label", "Save");
    setStateDirty(c, true);

    expect(getComponentAnchor(c)).toBe(anchor);
    expect(isComponentMounted(c)).toBe(true);
    expect(getComponentDefaults(c).label).toBe("Save");
    expect(isStateDirty(c)).toBe(true);
  });

  it("reads raw props and defaults through single-value helpers", () => {
    const c = new ConcreteStateful({ label: "From parent" });
    setComponentDefault(c, "label", "Default");

    expect(getComponentRawProp(c, "label")).toBe("From parent");
    expect(getComponentDefault(c, "label")).toBe("Default");
  });

  it("throws when component internals are read from a non-component", () => {
    expect(() => getComponentProps({})).toThrow(TypeError);
    expect(() => getComponentProps({})).toThrow(
      "Expected a PraxisJS component instance.",
    );
  });

  it("ignores dirty-state writes on non-component hosts", () => {
    const host = {};

    expect(() => markStateDirty(host)).not.toThrow();
    expect(() => setStateDirty(host, true)).not.toThrow();
    expect(isStateDirty(host)).toBe(false);
  });
});

class ConcreteStateless extends StatelessComponent<{ name: string }> {
  render() {
    return null;
  }
}

describe("StatelessComponent", () => {
  it("stores props in component internals", () => {
    const c = new ConcreteStateless({ name: "Alice" });
    expect((getComponentProps(c) as { name: string }).name).toBe("Alice");
  });

  it("setComponentProps replaces raw props contents", () => {
    const c = new ConcreteStateless({ name: "Alice" });
    setComponentProps(c, { name: "Bob" });
    expect((getComponentProps(c) as { name: string }).name).toBe("Bob");
  });

  it("setComponentProps removes old keys", () => {
    const c = new ConcreteStateless({ name: "Alice" });
    setComponentProps(c, {});
    expect((getComponentProps(c) as Record<string, unknown>).name).toBeUndefined();
  });

  it("accepts and exposes children via props.children", () => {
    const c = new ConcreteStateless({ name: "x", children: "hello" });
    expect(c.props.children).toBe("hello");
  });

  it("children is optional and defaults to undefined", () => {
    const c = new ConcreteStateless({ name: "x" });
    expect(c.props.children).toBeUndefined();
  });

  it("works with default generic (no explicit T)", () => {
    class Bare extends StatelessComponent {
      render() {
        return null;
      }
    }
    const c = new Bare({ children: "hi" });
    expect(c.props.children).toBe("hi");
  });
});
