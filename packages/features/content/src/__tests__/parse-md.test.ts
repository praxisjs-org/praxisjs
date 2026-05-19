import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "../parse-md";

describe("parseFrontmatter", () => {
  it("extracts frontmatter and body", () => {
    const { data, body } = parseFrontmatter(
      "---\ntitle: Hello\n---\n\n# Heading",
    );
    expect(data.title).toBe("Hello");
    expect(body).toBe("# Heading");
  });

  it("returns empty data and full content when no frontmatter", () => {
    const { data, body } = parseFrontmatter("# Just markdown");
    expect(data).toEqual({});
    expect(body).toBe("# Just markdown");
  });

  it("parses string value", () => {
    const { data } = parseFrontmatter("---\ntitle: My Post\n---\nbody");
    expect(data.title).toBe("My Post");
  });

  it("parses number value", () => {
    const { data } = parseFrontmatter("---\norder: 42\n---\nbody");
    expect(data.order).toBe(42);
  });

  it("parses boolean true", () => {
    const { data } = parseFrontmatter("---\ndraft: true\n---\nbody");
    expect(data.draft).toBe(true);
  });

  it("parses boolean false", () => {
    const { data } = parseFrontmatter("---\ndraft: false\n---\nbody");
    expect(data.draft).toBe(false);
  });

  it("parses inline array", () => {
    const { data } = parseFrontmatter(
      "---\ntags: [tutorial, beginner]\n---\nbody",
    );
    expect(data.tags).toEqual(["tutorial", "beginner"]);
  });

  it("parses quoted string", () => {
    const { data } = parseFrontmatter(
      '---\ntitle: "Quoted Title"\n---\nbody',
    );
    expect(data.title).toBe("Quoted Title");
  });

  it("handles CRLF line endings", () => {
    const { data, body } = parseFrontmatter(
      "---\r\ntitle: Hello\r\n---\r\n\r\n# Body",
    );
    expect(data.title).toBe("Hello");
    expect(body).toBe("# Body");
  });

  it("trims body whitespace", () => {
    const { body } = parseFrontmatter("---\ntitle: T\n---\n\n  content  ");
    expect(body).toBe("content");
  });

  it("ignores comment lines in YAML", () => {
    const { data } = parseFrontmatter(
      "---\n# this is a comment\ntitle: Hello\n---\nbody",
    );
    expect(data.title).toBe("Hello");
    expect(data["# this is a comment"]).toBeUndefined();
  });

  it("skips YAML lines with no colon", () => {
    const { data } = parseFrontmatter(
      "---\njust-a-word\ntitle: Hello\n---\nbody",
    );
    expect(data.title).toBe("Hello");
    expect(data["just-a-word"]).toBeUndefined();
  });

  it("skips YAML lines with an empty key (': value')", () => {
    const { data } = parseFrontmatter(
      "---\n: orphan-value\ntitle: Hello\n---\nbody",
    );
    expect(data.title).toBe("Hello");
    expect(data[""]).toBeUndefined();
  });

  it("parses null value (null keyword)", () => {
    const { data } = parseFrontmatter("---\nauthor: null\n---\nbody");
    expect(data.author).toBeNull();
  });

  it("parses null value (~ shorthand)", () => {
    const { data } = parseFrontmatter("---\nauthor: ~\n---\nbody");
    expect(data.author).toBeNull();
  });

  it("parses single-quoted string", () => {
    const { data } = parseFrontmatter(
      "---\ntitle: 'Single Quoted'\n---\nbody",
    );
    expect(data.title).toBe("Single Quoted");
  });
});
