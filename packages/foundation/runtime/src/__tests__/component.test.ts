// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { mountComponent } from "../component";
import { Scope } from "../scope";
import { RootComponent } from "@praxisjs/core/internal";

class SimpleComp extends RootComponent {
  render() {
    return document.createTextNode("hello");
  }
}

class NullComp extends RootComponent {
  render() { return null; }
}

class MultiComp extends RootComponent {
  render() {
    return [
      document.createTextNode("a"),
      document.createTextNode("b"),
    ];
  }
}

class ErrorComp extends RootComponent {
  onError(_err: Error) {}
  render(): never {
    throw new Error("render error");
  }
}

class LifecycleComp extends RootComponent {
  onBeforeMount() {}
  onMount() {}
  onUnmount() {}
  render() { return null; }
}

describe("mountComponent", () => {
  it("returns an array of nodes", () => {
    const scope = new Scope();
    const nodes = mountComponent(SimpleComp, {}, scope);
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes.length).toBeGreaterThan(0);
    scope.dispose();
  });

  it("wraps output with start/end comment anchors", () => {
    const scope = new Scope();
    const nodes = mountComponent(SimpleComp, {}, scope);
    expect(nodes[0].nodeType).toBe(Node.COMMENT_NODE);
    expect(nodes[nodes.length - 1].nodeType).toBe(Node.COMMENT_NODE);
    scope.dispose();
  });

  it("mounts the rendered content between comments", () => {
    const scope = new Scope();
    const container = document.createElement("div");
    const nodes = mountComponent(SimpleComp, {}, scope);
    nodes.forEach((n) => container.appendChild(n));
    expect(container.textContent).toContain("hello");
    scope.dispose();
  });

  it("calls onBeforeMount before render", () => {
    const scope = new Scope();
    const order: string[] = [];
    class OrderComp extends RootComponent {
      onBeforeMount() { order.push("before"); }
      render() {
        order.push("render");
        return null;
      }
    }
    mountComponent(OrderComp, {}, scope);
    expect(order).toEqual(["before", "render"]);
    scope.dispose();
  });

  it("calls onMount asynchronously after mount", async () => {
    const scope = new Scope();
    const comp = new LifecycleComp();
    // We can't easily capture the instance, but we can verify lifecycle is called
    // by observing the mount of LifecycleComp via its prototype
    const onMount = vi.spyOn(LifecycleComp.prototype, "onMount");
    mountComponent(LifecycleComp, {}, scope);
    expect(onMount).not.toHaveBeenCalled(); // not called synchronously
    await Promise.resolve(); // flush microtask
    expect(onMount).toHaveBeenCalled();
    onMount.mockRestore();
    scope.dispose();
  });

  it("calls onUnmount when scope is disposed", async () => {
    const scope = new Scope();
    const onUnmount = vi.spyOn(LifecycleComp.prototype, "onUnmount");
    mountComponent(LifecycleComp, {}, scope);
    await Promise.resolve();
    scope.dispose();
    expect(onUnmount).toHaveBeenCalled();
    onUnmount.mockRestore();
  });

  it("calls onError when render throws", () => {
    const scope = new Scope();
    const onError = vi.spyOn(ErrorComp.prototype, "onError");
    mountComponent(ErrorComp, {}, scope);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    onError.mockRestore();
    scope.dispose();
  });

  it("passes props to the component instance", () => {
    let receivedProp: unknown;
    class PropsComp extends RootComponent<{ msg: string }> {
      render() {
        receivedProp = this.props.msg;
        return null;
      }
    }
    const scope = new Scope();
    mountComponent(PropsComp as never, { msg: "hello" }, scope);
    expect(receivedProp).toBe("hello");
    scope.dispose();
  });

  it("mounts array of children", () => {
    const scope = new Scope();
    const container = document.createElement("div");
    const nodes = mountComponent(MultiComp, {}, scope);
    nodes.forEach((n) => container.appendChild(n));
    expect(container.textContent).toBe("ab");
    scope.dispose();
  });
});
