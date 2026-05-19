import { describe, it, expect } from "vitest";
import { Collection, PagedCollection } from "../decorators";
import { getCollection, registerCollection } from "../collection";
import { ContentSchema } from "../types";

// ── makeFieldCtx helper (mirrors pattern from router/store tests) ─────────────

function makeFieldCtx(name: string) {
  const initializers: Array<(this: unknown) => void> = [];
  return {
    ctx: {
      name,
      kind: "field" as const,
      addInitializer(fn: (this: unknown) => void) {
        initializers.push(fn);
      },
    } as ClassFieldDecoratorContext,
    run(instance: unknown) {
      initializers.forEach((fn) => {
        fn.call(instance);
      });
    },
  };
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const MOCK_GLOB = {
  "./posts/first.md": "---\ntitle: First\n---\nHello.",
};

// ── Class decorator path ──────────────────────────────────────────────────────

describe("@Collection class decorator", () => {
  it("registers the collection so getCollection resolves entries", async () => {
    @Collection(MOCK_GLOB)
    class Articles extends ContentSchema {
      title = "";
    }

    const entries = await getCollection(Articles);
    expect(entries).toHaveLength(1);
    expect(entries[0].data.title).toBe("First");
  });

  it("returns the same class unchanged", () => {
    class Notes extends ContentSchema {
      title = "";
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (Collection(MOCK_GLOB) as any)(Notes, {} as ClassDecoratorContext);
    expect(result).toBe(Notes);
  });
});

// ── Field decorator path ──────────────────────────────────────────────────────

describe("@Collection field decorator", () => {
  it("injects a Resource with data(), pending(), and error()", () => {
    class Posts extends ContentSchema {
      title = "";
    }
    registerCollection(Posts as never, { glob: MOCK_GLOB });

    const { ctx, run } = makeFieldCtx("posts");
    Collection(Posts)(undefined, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    const res = instance.posts as Record<string, unknown>;
    expect(typeof res.data).toBe("function");
    expect(typeof res.pending).toBe("function");
    expect(typeof res.error).toBe("function");
    expect(typeof res.refetch).toBe("function");
  });

  it("no-op setter does not throw", () => {
    class Docs extends ContentSchema {
      title = "";
    }
    registerCollection(Docs as never, { glob: MOCK_GLOB });

    const { ctx, run } = makeFieldCtx("docs");
    Collection(Docs)(undefined, ctx);

    const instance: Record<string, unknown> = {};
    run(instance);

    // Setting the field should silently no-op
    expect(() => {
      instance.docs = null;
    }).not.toThrow();
  });
});

// ── @PagedCollection ──────────────────────────────────────────────────────────

describe("@PagedCollection field decorator", () => {
  class Articles extends ContentSchema { title = ""; }

  function setupArticles() {
    registerCollection(Articles as never, {
      glob: {
        "./articles/a.md": "---\ntitle: A\n---",
        "./articles/b.md": "---\ntitle: B\n---",
        "./articles/c.md": "---\ntitle: C\n---",
      },
    });
  }

  it("injects a Resource with data(), pending(), and error()", () => {
    setupArticles();
    const { ctx, run } = makeFieldCtx("articles");
    PagedCollection(Articles, "pager")(undefined, ctx);

    const instance: Record<string, unknown> = {
      pager: { page: 1, pageSize: 2 },
    };
    run(instance);

    const res = instance.articles as Record<string, unknown>;
    expect(typeof res.data).toBe("function");
    expect(typeof res.pending).toBe("function");
    expect(typeof res.error).toBe("function");
    expect(typeof res.refetch).toBe("function");
  });

  it("no-op setter does not throw", () => {
    setupArticles();
    const { ctx, run } = makeFieldCtx("articles2");
    PagedCollection(Articles, "pager")(undefined, ctx);

    const instance: Record<string, unknown> = {
      pager: { page: 1, pageSize: 5 },
    };
    run(instance);

    expect(() => { instance.articles2 = null; }).not.toThrow();
  });
});

// ── index re-exports ──────────────────────────────────────────────────────────

describe("index re-exports", () => {
  it("Collection is exported from the package index", async () => {
    const mod = await import("../index");
    expect(typeof mod.Collection).toBe("function");
  });

  it("ContentSchema is exported from the package index", async () => {
    const mod = await import("../index");
    expect(mod.ContentSchema).toBeDefined();
  });

  it("getCollection is exported from the package index", async () => {
    const mod = await import("../index");
    expect(typeof mod.getCollection).toBe("function");
  });

  it("getEntry is exported from the package index", async () => {
    const mod = await import("../index");
    expect(typeof mod.getEntry).toBe("function");
  });
});
