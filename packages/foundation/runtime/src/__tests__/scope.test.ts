import { describe, it, expect, vi } from "vitest";

import { Scope } from "../scope";

describe("Scope", () => {
  it("add() registers a cleanup fn that runs on dispose()", () => {
    const scope = new Scope();
    const cleanup = vi.fn();
    scope.add(cleanup);
    scope.dispose();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("dispose() runs all cleanups in order", () => {
    const scope = new Scope();
    const order: number[] = [];
    scope.add(() => order.push(1));
    scope.add(() => order.push(2));
    scope.add(() => order.push(3));
    scope.dispose();
    expect(order).toEqual([1, 2, 3]);
  });

  it("dispose() clears cleanups — second dispose() is a no-op", () => {
    const scope = new Scope();
    const fn = vi.fn();
    scope.add(fn);
    scope.dispose();
    scope.dispose();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("effect() registers a reactive effect and its cleanup", () => {
    const scope = new Scope();
    const ran: number[] = [];
    scope.effect(() => {
      ran.push(1);
    });
    expect(ran).toHaveLength(1); // runs immediately
    scope.dispose();
  });

  it("fork() creates a child scope that disposes when parent disposes", () => {
    const parent = new Scope();
    const child = parent.fork();
    const childCleanup = vi.fn();
    child.add(childCleanup);
    parent.dispose();
    expect(childCleanup).toHaveBeenCalledOnce();
  });

  it("cleanup that throws does not prevent other cleanups from running", () => {
    const scope = new Scope();
    const ran: number[] = [];
    scope.add(() => { ran.push(1); });
    scope.add(() => { throw new Error("boom"); });
    scope.add(() => { ran.push(3); });
    expect(() => { scope.dispose(); }).toThrow();
    expect(ran).toEqual([1, 3]);
  });

  it("grandchild scopes: parent.fork().fork() — disposing parent disposes all descendants", () => {
    const parent = new Scope();
    const child = parent.fork();
    const grandchild = child.fork();
    const grandchildFn = vi.fn();
    const childFn = vi.fn();
    grandchild.add(grandchildFn);
    child.add(childFn);
    parent.dispose();
    expect(childFn).toHaveBeenCalledOnce();
    expect(grandchildFn).toHaveBeenCalledOnce();
  });

  it("dispose() called during a cleanup does not crash", () => {
    const scope = new Scope();
    scope.add(() => {
      // calling dispose() again during a cleanup — should be safe (no-op, cleanups already cleared)
      scope.dispose();
    });
    expect(() => { scope.dispose(); }).not.toThrow();
  });

  it("cleanup added inside a cleanup is NOT called in the same dispose cycle", () => {
    const scope = new Scope();
    const inner = vi.fn();
    scope.add(() => {
      scope.add(inner);
    });
    scope.dispose();
    expect(inner).not.toHaveBeenCalled();
  });

  it("fork() child can be disposed independently before parent", () => {
    const parent = new Scope();
    const child = parent.fork();
    const childFn = vi.fn();
    child.add(childFn);
    child.dispose();
    expect(childFn).toHaveBeenCalledOnce();
    // parent dispose should not throw even though child is already disposed
    expect(() => { parent.dispose(); }).not.toThrow();
  });
});
