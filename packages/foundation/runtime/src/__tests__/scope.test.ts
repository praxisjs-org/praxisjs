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
