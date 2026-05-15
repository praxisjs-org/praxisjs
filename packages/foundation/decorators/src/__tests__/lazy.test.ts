// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { Lazy } from "../component/lazy";
import type { LazyOptions } from "../component/lazy";

type AnyConstructor = new (...args: unknown[]) => StatefulComponent;

function applyLazy<T extends AnyConstructor>(cls: T, placeholderOrOptions?: number | LazyOptions): T {
  if (placeholderOrOptions === undefined) return Lazy()(cls, {} as ClassDecoratorContext);
  return Lazy(placeholderOrOptions)(cls, {} as ClassDecoratorContext);
}

/** render() now returns a reactive thunk — resolve it to get the actual DOM output. */
function resolveRender(instance: StatefulComponent): Node | Node[] | null {
  const result = instance.render();
  if (typeof result === "function") return (result as () => Node | Node[] | null)();
  return result;
}

class BaseComp extends StatefulComponent {
  render() {
    return document.createTextNode("content");
  }
}

describe("Lazy decorator", () => {
  let intersectionCallback: IntersectionObserverCallback = () => {};
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    intersectionCallback = () => {};
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();

    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        intersectionCallback = cb;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
    } as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    // @ts-expect-error – removing test stub
    delete globalThis.IntersectionObserver;
  });

  it("returns null from render before visibility", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor);
    const instance = new Wrapped();
    expect(resolveRender(instance)).toBeNull();
  });

  it("sets _lazyVisible to true when IntersectionObserver is not supported", () => {
    // Remove IntersectionObserver to simulate unsupported environment
    // @ts-expect-error – removing test stub
    delete globalThis.IntersectionObserver;

    const Wrapped = applyLazy(BaseComp as AnyConstructor);
    const instance = new Wrapped();

    // Simulate anchor with parent element
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    // Without IntersectionObserver, component should immediately become visible
    expect(instance.render()).not.toBeNull();
    document.body.removeChild(parent);
  });

  it("sets minHeight placeholder on mount", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor, 300);
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    expect(parent.style.minHeight).toBe("300px");
    document.body.removeChild(parent);
  });

  it("sets _lazyVisible and clears minHeight when intersecting", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor, 200);
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    expect(resolveRender(instance)).toBeNull();

    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );

    expect(parent.style.minHeight).toBe("");
    expect(resolveRender(instance)).not.toBeNull(); // component became visible after intersection
    expect(mockDisconnect).toHaveBeenCalled();
    document.body.removeChild(parent);
  });

  it("does nothing when _anchor has no parent", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor);
    const instance = new Wrapped();

    const anchor = document.createComment("end");
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    // Should not throw even though anchor has no parent
    expect(() => instance.onMount?.()).not.toThrow();
  });

  it("disconnects observer on unmount", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor);
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    instance.onUnmount?.();
    expect(mockDisconnect).toHaveBeenCalled();
    document.body.removeChild(parent);
  });

  it("onMount does nothing when _anchor is undefined", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor);
    const instance = new Wrapped();
    // _anchor is undefined by default
    expect(() => instance.onMount?.()).not.toThrow();
  });

  it("render() returns original content after becoming visible", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor, 200);
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    expect(resolveRender(instance)).toBeNull(); // not yet visible

    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );

    // Now visible: render() must delegate to the original render()
    const result = resolveRender(instance);
    expect(result).not.toBeNull();
    document.body.removeChild(parent);
  });

  it("observer stays active and minHeight is preserved when entry is not intersecting", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor, 200);
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();

    // Fire callback with isIntersecting=false — should be a no-op
    intersectionCallback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );

    expect(resolveRender(instance)).toBeNull();
    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(parent.style.minHeight).toBe("200px");
    document.body.removeChild(parent);
  });

  it("accepts a LazyOptions object instead of a number (line 74 false branch)", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor, { placeholder: 150, rootMargin: "50px" });
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    expect(parent.style.minHeight).toBe("150px");
    document.body.removeChild(parent);
  });

  it("uses root.current as the IntersectionObserver root when provided (line 42 false branch)", () => {
    const rootEl = document.createElement("div");
    document.body.appendChild(rootEl);

    let capturedInit: IntersectionObserverInit | undefined;
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        intersectionCallback = cb;
        capturedInit = init;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
    } as unknown as typeof IntersectionObserver;

    const Wrapped = applyLazy(BaseComp as AnyConstructor, { root: { current: rootEl } });
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    expect(capturedInit?.root).toBe(rootEl);

    document.body.removeChild(parent);
    document.body.removeChild(rootEl);
  });

  it("falls back to null root when root.current is null (line 42 ?? null branch)", () => {
    let capturedInit: IntersectionObserverInit | undefined;
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
        intersectionCallback = cb;
        capturedInit = init;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
    } as unknown as typeof IntersectionObserver;

    const Wrapped = applyLazy(BaseComp as AnyConstructor, { root: { current: null } });
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    expect(capturedInit?.root).toBeNull();

    document.body.removeChild(parent);
  });

  it("does not re-apply minHeight on remount when already visible", () => {
    const Wrapped = applyLazy(BaseComp as AnyConstructor, 300);
    const instance = new Wrapped();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const anchor = document.createComment("end");
    parent.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    // First mount — become visible
    instance.onMount?.();
    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );
    instance.onUnmount?.();

    // Second mount — _lazyVisible is already true
    instance.onMount?.();

    // minHeight must NOT be re-applied because _lazyVisible() is true
    expect(parent.style.minHeight).toBe("");
    document.body.removeChild(parent);
  });
});
