import { describe, it, expect } from "vitest";

import { compilePath, parseQuery } from "../utils";

describe("compilePath", () => {
  it("compiles a static path", () => {
    const { regex, paramNames } = compilePath("/about");
    expect(regex.test("/about")).toBe(true);
    expect(regex.test("/about/")).toBe(false);
    expect(paramNames).toEqual([]);
  });

  it("compiles a path with a single param", () => {
    const { regex, paramNames } = compilePath("/users/:id");
    expect(paramNames).toEqual(["id"]);
    const m = regex.exec("/users/42");
    expect(m).not.toBeNull();
    expect(m![1]).toBe("42");
  });

  it("compiles a path with multiple params", () => {
    const { regex, paramNames } = compilePath("/users/:userId/posts/:postId");
    expect(paramNames).toEqual(["userId", "postId"]);
    const m = regex.exec("/users/1/posts/99");
    expect(m![1]).toBe("1");
    expect(m![2]).toBe("99");
  });

  it("compiles a wildcard path (**)", () => {
    const { regex } = compilePath("/docs/**");
    expect(regex.test("/docs/a/b/c")).toBe(true);
    expect(regex.test("/docs/")).toBe(true);
  });

  it("does not match partial paths", () => {
    const { regex } = compilePath("/home");
    expect(regex.test("/homepage")).toBe(false);
  });

  it("root path / matches only /", () => {
    const { regex } = compilePath("/");
    expect(regex.test("/")).toBe(true);
    expect(regex.test("/home")).toBe(false);
  });
});

describe("parseQuery", () => {
  it("returns empty object for empty string", () => {
    expect(parseQuery("")).toEqual({});
  });

  it("returns empty object for bare ?", () => {
    expect(parseQuery("?")).toEqual({});
  });

  it("parses a single key=value", () => {
    expect(parseQuery("?foo=bar")).toEqual({ foo: "bar" });
  });

  it("parses multiple key=value pairs", () => {
    expect(parseQuery("?a=1&b=2&c=3")).toEqual({ a: "1", b: "2", c: "3" });
  });

  it("handles query string without leading ?", () => {
    expect(parseQuery("x=hello")).toEqual({ x: "hello" });
  });

  it("handles encoded characters", () => {
    const result = parseQuery("?name=John%20Doe");
    expect(result.name).toBe("John Doe");
  });
});
