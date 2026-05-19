import { describe, it, expect, vi } from "vitest";
import { applySchema } from "../schema";
import { ContentSchema } from "../types";

class Post extends ContentSchema {
  title = "";
  date = "";
  draft = false;
  views = 0;
  tags: string[] = [];
}

describe("applySchema", () => {
  it("copies valid fields to result", () => {
    const result = applySchema(Post, { title: "Hello", date: "2024-01-01" }, "slug");
    expect(result.title).toBe("Hello");
    expect(result.date).toBe("2024-01-01");
  });

  it("keeps default for missing non-zero field and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = applySchema(Post, {}, "my-post");
    expect(result.title).toBe("");   // empty string default — no warn
    expect(result.draft).toBe(false); // false default — no warn
    expect(result.views).toBe(0);    // 0 default — no warn
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns on missing required-style field (non-zero default)", () => {
    class Article extends ContentSchema {
      title = "Untitled"; // non-empty default
    }
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    applySchema(Article, {}, "slug");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing field"));
    warn.mockRestore();
  });

  it("keeps default and warns on wrong type", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = applySchema(Post, { title: 42 }, "slug");
    expect(result.title).toBe(""); // keeps default
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("wrong type"));
    warn.mockRestore();
  });

  it("accepts valid array field", () => {
    const result = applySchema(Post, { tags: ["a", "b"] }, "slug");
    expect(result.tags).toEqual(["a", "b"]);
  });

  it("keeps default and warns when array field receives non-array", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = applySchema(Post, { tags: "not-an-array" }, "slug");
    expect(result.tags).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("wrong type"));
    warn.mockRestore();
  });

  it("returns an instance of the SchemaClass", () => {
    const result = applySchema(Post, { title: "Hi" }, "slug");
    expect(result).toBeInstanceOf(Post);
  });

  it("accepts boolean fields correctly", () => {
    const result = applySchema(Post, { draft: true }, "slug");
    expect(result.draft).toBe(true);
  });
});
