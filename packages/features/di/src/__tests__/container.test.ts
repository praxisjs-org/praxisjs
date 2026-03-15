import "reflect-metadata";
import { describe, it, expect } from "vitest";

import { Container, Token, token } from "../container";

describe("Token", () => {
  it("stores description", () => {
    const t = new Token("MY_SERVICE");
    expect(t.description).toBe("MY_SERVICE");
  });

  it("toString includes description", () => {
    const t = new Token("FOO");
    expect(t.toString()).toBe("Token(FOO)");
  });

  it("token() factory creates a Token", () => {
    const t = token<string>("DB_URL");
    expect(t).toBeInstanceOf(Token);
    expect(t.description).toBe("DB_URL");
  });
});

describe("Container", () => {
  it("registers and resolves a singleton service", () => {
    class MyService {}
    const c = new Container();
    c.register(MyService);
    const a = c.resolve(MyService);
    const b = c.resolve(MyService);
    expect(a).toBeInstanceOf(MyService);
    expect(a).toBe(b); // singleton
  });

  it("creates new instance for transient scope", () => {
    class Counter {
      value = Math.random();
    }
    const c = new Container();
    c.register(Counter, { scope: "transient" });
    const a = c.resolve(Counter);
    const b = c.resolve(Counter);
    expect(a).not.toBe(b);
  });

  it("throws when resolving unregistered service", () => {
    class Unknown {}
    const c = new Container();
    expect(() => c.resolve(Unknown)).toThrow("[DI] Service not registered");
  });

  it("registerValue stores a value by token", () => {
    const DB_URL = token<string>("DB_URL");
    const c = new Container();
    c.registerValue(DB_URL, "postgres://localhost/db");
    expect(c.resolve(DB_URL)).toBe("postgres://localhost/db");
  });

  it("registerFactory computes value via factory", () => {
    const MAX = token<number>("MAX");
    const c = new Container();
    c.registerFactory(MAX, () => 100);
    expect(c.resolve(MAX)).toBe(100);
  });

  it("throws for unregistered token", () => {
    const t = token<string>("MISSING");
    const c = new Container();
    expect(() => c.resolve(t)).toThrow("[DI] Token not registered");
  });

  it("child container resolves from parent", () => {
    const URL_TOKEN = token<string>("URL");
    const parent = new Container();
    parent.registerValue(URL_TOKEN, "https://example.com");
    const child = parent.createChild();
    expect(child.resolve(URL_TOKEN)).toBe("https://example.com");
  });

  it("child container can override parent registration", () => {
    const URL_TOKEN = token<string>("URL");
    const parent = new Container();
    parent.registerValue(URL_TOKEN, "https://parent.com");
    const child = parent.createChild();
    child.registerValue(URL_TOKEN, "https://child.com");
    expect(child.resolve(URL_TOKEN)).toBe("https://child.com");
    expect(parent.resolve(URL_TOKEN)).toBe("https://parent.com");
  });

  it("register() is chainable", () => {
    class A {}
    class B {}
    const c = new Container();
    expect(c.register(A).register(B)).toBe(c);
  });
});
