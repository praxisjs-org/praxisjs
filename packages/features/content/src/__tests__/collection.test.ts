import { describe, it, expect } from "vitest";
import { getCollection, getEntry, getTotal, getPage, pathToSlug, registerCollection } from "../collection";
import { ContentSchema } from "../types";

class Blog extends ContentSchema {
  title = "";
  date  = "";
  draft = false;
}

const EAGER_GLOB = {
  "./blog/hello-world.md": "---\ntitle: Hello World\ndate: 2024-01-01\ndraft: false\n---\n\n# Hello\n\nContent.",
  "./blog/second-post.md": "---\ntitle: Second Post\ndate: 2024-02-01\ndraft: true\n---\n\nBody here.",
};

function setupBlog() {
  registerCollection(Blog as unknown as typeof ContentSchema, { glob: EAGER_GLOB });
}

describe("pathToSlug", () => {
  it("strips directory and extension", () => {
    expect(pathToSlug("./blog/my-post.md")).toBe("my-post");
  });

  it("handles nested paths", () => {
    expect(pathToSlug("src/content/blog/getting-started.md")).toBe("getting-started");
  });

  it("handles .mdx extension", () => {
    expect(pathToSlug("./docs/intro.mdx")).toBe("intro");
  });

  it("handles filename-only path", () => {
    expect(pathToSlug("simple.md")).toBe("simple");
  });
});

describe("getCollection (eager glob)", () => {
  it("returns one entry per file", async () => {
    setupBlog();
    const entries = await getCollection(Blog);
    expect(entries).toHaveLength(2);
  });

  it("parses frontmatter into data", async () => {
    setupBlog();
    const entries = await getCollection(Blog);
    const hello = entries.find(e => e.slug === "hello-world")!;
    expect(hello.data.title).toBe("Hello World");
    expect(hello.data.draft).toBe(false);
  });

  it("sets raw body and html", async () => {
    setupBlog();
    const entries = await getCollection(Blog);
    const hello = entries.find(e => e.slug === "hello-world")!;
    expect(hello.body).toContain("# Hello");
    expect(hello.html).toContain("<h1");
  });

  it("sorts entries by slug", async () => {
    setupBlog();
    const entries = await getCollection(Blog);
    expect(entries[0].slug).toBe("hello-world");
    expect(entries[1].slug).toBe("second-post");
  });

  it("throws when collection was not registered", async () => {
    class Unregistered extends ContentSchema { title = ""; }
    await expect(getCollection(Unregistered)).rejects.toThrow(
      "Unregistered is not registered",
    );
  });
});

describe("getCollection (lazy glob)", () => {
  it("resolves lazy loaders", async () => {
    class LazyBlog extends ContentSchema { title = ""; }
    const lazyGlob = {
      "./post.md": () => Promise.resolve("---\ntitle: Lazy Post\n---\nBody."),
    };
    registerCollection(LazyBlog as unknown as typeof ContentSchema, { glob: lazyGlob });
    const entries = await getCollection(LazyBlog);
    expect(entries).toHaveLength(1);
    expect(entries[0].data.title).toBe("Lazy Post");
  });
});

describe("getTotal", () => {
  it("returns the number of files without loading content", () => {
    setupBlog();
    expect(getTotal(Blog)).toBe(2);
  });

  it("throws when collection is not registered", () => {
    class Unreg extends ContentSchema { title = ""; }
    expect(() => getTotal(Unreg)).toThrow("Unreg is not registered");
  });
});

describe("getPage", () => {
  class Paged extends ContentSchema { title = ""; }

  function setupPaged() {
    registerCollection(Paged as unknown as typeof ContentSchema, {
      glob: {
        "./a.md": "---\ntitle: A\n---",
        "./b.md": "---\ntitle: B\n---",
        "./c.md": "---\ntitle: C\n---",
        "./d.md": "---\ntitle: D\n---",
        "./e.md": "---\ntitle: E\n---",
      },
    });
  }

  it("returns first page slice in sorted order", async () => {
    setupPaged();
    const page = await getPage(Paged, { page: 1, pageSize: 2 });
    expect(page).toHaveLength(2);
    expect(page[0].slug).toBe("a");
    expect(page[1].slug).toBe("b");
  });

  it("returns second page slice", async () => {
    setupPaged();
    const page = await getPage(Paged, { page: 2, pageSize: 2 });
    expect(page).toHaveLength(2);
    expect(page[0].slug).toBe("c");
    expect(page[1].slug).toBe("d");
  });

  it("returns partial last page", async () => {
    setupPaged();
    const page = await getPage(Paged, { page: 3, pageSize: 2 });
    expect(page).toHaveLength(1);
    expect(page[0].slug).toBe("e");
  });

  it("returns empty array for out-of-range page", async () => {
    setupPaged();
    const page = await getPage(Paged, { page: 100, pageSize: 2 });
    expect(page).toHaveLength(0);
  });

  it("throws when collection is not registered", async () => {
    class Unreg extends ContentSchema { title = ""; }
    await expect(getPage(Unreg, { page: 1, pageSize: 2 })).rejects.toThrow("Unreg is not registered");
  });
});

describe("getEntry", () => {
  it("returns the matching entry", async () => {
    setupBlog();
    const entry = await getEntry(Blog, "second-post");
    expect(entry).not.toBeNull();
    expect(entry!.data.title).toBe("Second Post");
  });

  it("returns null when slug does not exist", async () => {
    setupBlog();
    const entry = await getEntry(Blog, "does-not-exist");
    expect(entry).toBeNull();
  });

  it("loads only the matching file, not all files", async () => {
    class SingleLoad extends ContentSchema { title = ""; }
    let aLoaded = false;
    let bLoaded = false;
    registerCollection(SingleLoad as unknown as typeof ContentSchema, {
      glob: {
        "./a.md": () => { aLoaded = true; return Promise.resolve("---\ntitle: A\n---"); },
        "./b.md": () => { bLoaded = true; return Promise.resolve("---\ntitle: B\n---"); },
      },
    });
    await getEntry(SingleLoad, "b");
    expect(aLoaded).toBe(false);
    expect(bLoaded).toBe(true);
  });
});
