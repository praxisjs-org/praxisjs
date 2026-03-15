import { describe, it, expect } from "vitest";

import { RootComponent } from "../component/base";
import { StatefulComponent } from "../component/stateful";

class ConcreteRoot extends RootComponent<{ name: string }> {
  render() { return null; }
}

class ConcreteStateful extends StatefulComponent {
  render() { return null; }
}

describe("RootComponent", () => {
  it("stores props on _rawProps", () => {
    const c = new ConcreteRoot({ name: "Alice" });
    expect(c._rawProps.name).toBe("Alice");
  });

  it("exposes props via .props getter", () => {
    const c = new ConcreteRoot({ name: "Bob" });
    expect(c.props.name).toBe("Bob");
  });

  it("_mounted starts as false", () => {
    const c = new ConcreteRoot({ name: "" });
    expect(c._mounted).toBe(false);
  });

  it("_anchor starts as undefined", () => {
    const c = new ConcreteRoot({ name: "" });
    expect(c._anchor).toBeUndefined();
  });

  it("defaults to empty object when no props given", () => {
    const c = new ConcreteRoot();
    expect(c._rawProps).toEqual({});
  });
});

describe("StatefulComponent", () => {
  it("_defaults starts as empty object", () => {
    const c = new ConcreteStateful();
    expect(c._defaults).toEqual({});
  });

  it("_stateDirty starts as false", () => {
    const c = new ConcreteStateful();
    expect(c._stateDirty).toBe(false);
  });

  it("_setProps replaces _rawProps contents", () => {
    const c = new ConcreteStateful({ x: 1 });
    c._setProps({ y: 2 });
    expect((c._rawProps).x).toBeUndefined();
    expect((c._rawProps).y).toBe(2);
  });
});
