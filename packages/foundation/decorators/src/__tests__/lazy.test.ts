// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { Lazy } from "../component/lazy";

type AnyConstructor = new (...args: unknown[]) => StatefulComponent;

function applyLazy<T extends AnyConstructor>(cls: T, placeholder?: number): T {
  return placeholder !== undefined
    ? Lazy(placeholder)(cls, {} as ClassDecoratorContext)
    : Lazy()(cls, {} as ClassDecoratorContext);
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
    expect(instance.render()).toBeNull();
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
    // Without IntersectionObserver, _lazyVisible should be set to true
    const lazyVisible = (instance as unknown as { _lazyVisible: () => boolean })._lazyVisible;
    expect(lazyVisible()).toBe(true);
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
    expect(instance.render()).toBeNull();

    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );

    expect(parent.style.minHeight).toBe("");
    const lazyVisible = (instance as unknown as { _lazyVisible: () => boolean })._lazyVisible;
    expect(lazyVisible()).toBe(true);
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
    expect(instance.render()).toBeNull(); // not yet visible

    intersectionCallback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      null as unknown as IntersectionObserver,
    );

    // Now visible: render() must delegate to the original render()
    const result = instance.render();
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

    expect(instance.render()).toBeNull();
    expect(mockDisconnect).not.toHaveBeenCalled();
    expect(parent.style.minHeight).toBe("200px");
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
