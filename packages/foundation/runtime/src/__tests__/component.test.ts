// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { mountComponent } from "../component";
import { Scope } from "../scope";
import { StatefulComponent } from "@praxisjs/core";

class SimpleComp extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  render() {
    return document.createTextNode("hello");
  }
}

class NullComp extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  render() { return null; }
}

class MultiComp extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  render() {
    return [
      document.createTextNode("a"),
      document.createTextNode("b"),
    ];
  }
}

class ErrorComp extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  onError(_err: Error) {}
  render(): never {
    throw new Error("render error");
  }
}

class NonErrorThrowComp extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  onError(_err: Error) {}
  render(): never {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw "string render error";
  }
}

class LifecycleComp extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
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
    class OrderComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
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

  it("wraps non-Error throws in Error before passing to onError", () => {
    const scope = new Scope();
    const onError = vi.spyOn(NonErrorThrowComp.prototype, "onError");
    mountComponent(NonErrorThrowComp, {}, scope);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect((onError.mock.calls[0][0] as Error).message).toBe("string render error");
    onError.mockRestore();
    scope.dispose();
  });

  it("passes props to the component instance", () => {
    let receivedProp: unknown;
    class PropsComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        receivedProp = this.props.msg;
        return null;
      }
    }
    const scope = new Scope();
    mountComponent(PropsComp, { msg: "hello" }, scope);
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

  it("onError handler that itself throws — outer error propagates", () => {
    class ThrowingErrorComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      onError(_err: Error) {
        throw new Error("onError also throws");
      }
      render(): never {
        throw new Error("render error");
      }
    }
    const scope = new Scope();
    expect(() => mountComponent(ThrowingErrorComp, {}, scope)).toThrow("onError also throws");
    scope.dispose();
  });

  it("onMount microtask fires after dispose() — onMount is still called (current behavior)", async () => {
    class MountAfterDisposeComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      onMount() {}
      render() { return null; }
    }
    const scope = new Scope();
    const onMount = vi.spyOn(MountAfterDisposeComp.prototype, "onMount");
    mountComponent(MountAfterDisposeComp, {}, scope);
    scope.dispose(); // dispose before microtask flushes
    await Promise.resolve(); // flush microtask
    // The queueMicrotask callback runs regardless — documents current behavior
    expect(onMount).toHaveBeenCalled();
    onMount.mockRestore();
  });

  it("ref callback receives the instance after onMount", async () => {
    const scope = new Scope();
    const refs: Array<object | null> = [];
    const nodes = mountComponent(LifecycleComp, { ref: (inst: object | null) => { refs.push(inst); } }, scope);
    expect(refs).toHaveLength(0); // not called synchronously
    await Promise.resolve();
    expect(refs).toHaveLength(1);
    expect(refs[0]).toBeInstanceOf(LifecycleComp);
    nodes.length; // suppress unused warning
    scope.dispose();
  });

  it("ref callback is called with null on unmount", async () => {
    const scope = new Scope();
    const refs: Array<object | null> = [];
    mountComponent(LifecycleComp, { ref: (inst: object | null) => { refs.push(inst); } }, scope);
    await Promise.resolve();
    scope.dispose();
    expect(refs).toEqual([expect.any(LifecycleComp), null]);
  });

  it("ref is not forwarded to component props", () => {
    let seenRef: unknown = "not-checked";
    class RefCheckComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      render() {
        seenRef = (this.props as Record<string, unknown>).ref;
        return null;
      }
    }
    const scope = new Scope();
    const refFn = () => {};
    mountComponent(RefCheckComp, { ref: refFn }, scope);
    expect(seenRef).toBeUndefined();
    scope.dispose();
  });

  it("component with no render() method — error reaches onError handler", () => {
    let caughtError: Error | undefined;
    class NoRenderComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      onError(err: Error) { caughtError = err; }
      render(): Node[] { throw new TypeError("render is not implemented"); }
    }
    const scope = new Scope();
    // mountComponent catches the TypeError and routes it through onError
    expect(() => mountComponent(NoRenderComp as never, {}, scope)).not.toThrow();
    expect(caughtError).toBeInstanceOf(Error);
    scope.dispose();
  });
});
