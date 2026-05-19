// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { signal } from "@praxisjs/core/internal";
import { StatefulComponent } from "@praxisjs/core";

import { Head } from "../index";
import { pushHead, removeHead, _resetHead } from "../head-stack";

beforeEach(() => {
  document.head.innerHTML = "";
  _resetHead();
  document.title = "initial";
});

// ─── head-stack unit tests ────────────────────────────────────────────────────

describe("pushHead / removeHead", () => {
  it("sets document.title", () => {
    const id = Symbol();
    pushHead(id, { title: "Hello" });
    expect(document.title).toBe("Hello");
  });

  it("adds meta name=description", () => {
    const id = Symbol();
    pushHead(id, { description: "My desc" });
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe("My desc");
  });

  it("adds og: meta properties", () => {
    const id = Symbol();
    pushHead(id, { og: { title: "OG Title", image: "https://example.com/img.jpg" } });
    expect(document.querySelector('[property="og:title"]')?.getAttribute("content")).toBe("OG Title");
    expect(document.querySelector('[property="og:image"]')?.getAttribute("content")).toBe("https://example.com/img.jpg");
  });

  it("adds twitter: meta tags", () => {
    const id = Symbol();
    pushHead(id, { twitter: { card: "summary_large_image", title: "TW" } });
    expect(document.querySelector('[name="twitter:card"]')?.getAttribute("content")).toBe("summary_large_image");
    expect(document.querySelector('[name="twitter:title"]')?.getAttribute("content")).toBe("TW");
  });

  it("adds canonical link", () => {
    const id = Symbol();
    pushHead(id, { canonical: "https://example.com/page" });
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://example.com/page");
  });

  it("adds arbitrary meta[] by name and property", () => {
    const id = Symbol();
    pushHead(id, {
      meta: [
        { name: "robots", content: "noindex" },
        { property: "fb:app_id", content: "12345" },
      ],
    });
    expect(document.querySelector('[name="robots"]')?.getAttribute("content")).toBe("noindex");
    expect(document.querySelector('[property="fb:app_id"]')?.getAttribute("content")).toBe("12345");
  });

  it("updates an existing entry (no duplicate push)", () => {
    const id = Symbol();
    pushHead(id, { title: "v1" });
    pushHead(id, { title: "v2" });
    expect(document.title).toBe("v2");
  });

  it("restores initial title and removes managed metas on removeHead", () => {
    const id = Symbol();
    pushHead(id, { title: "Page", description: "Desc" });
    removeHead(id);
    expect(document.title).toBe("initial");
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });

  it("stack: last entry wins; removing it restores the previous one", () => {
    const a = Symbol();
    const b = Symbol();
    pushHead(a, { title: "A", description: "desc-a" });
    pushHead(b, { title: "B", description: "desc-b" });
    expect(document.title).toBe("B");
    removeHead(b);
    expect(document.title).toBe("A");
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe("desc-a");
  });

  it("removes all managed metas when stack is empty", () => {
    const id = Symbol();
    pushHead(id, { description: "x", og: { title: "y" } });
    removeHead(id);
    expect(document.querySelectorAll("[data-praxis-head]").length).toBe(0);
  });

  it("omits undefined og fields", () => {
    const id = Symbol();
    pushHead(id, { og: { title: "T" } });
    expect(document.querySelector('[property="og:image"]')).toBeNull();
    expect(document.querySelector('[property="og:title"]')?.getAttribute("content")).toBe("T");
  });
});

// ─── @Head decorator ──────────────────────────────────────────────────────────

// All decorated classes at module scope for correct TypeScript inference.

@Head({ title: "Static Title", description: "Static desc" })
class StaticComp extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  render() { return null; }
}

@Head({ title: "Before" })
class BeforeComp extends StatefulComponent {
  static __isComponent = true as const;
  static __isStateless = false;
  render() { return null; }
}

describe("@Head decorator — static config", () => {
  it("applies head config on onMount", () => {
    const inst = new StaticComp({});
    inst.onMount?.();
    expect(document.title).toBe("Static Title");
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe("Static desc");
    inst.onUnmount?.();
  });

  it("removes head config on onUnmount", () => {
    const inst = new BeforeComp({});
    inst.onMount?.();
    expect(document.title).toBe("Before");
    inst.onUnmount?.();
    expect(document.title).toBe("initial");
  });
});

describe("@Head decorator — reactive config", () => {
  it("updates document head when signal changes", async () => {
    const count = signal(0);

    @Head((self: ReactiveComp) => ({ title: `Count: ${self.n()}` }))
    class ReactiveComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      n = count;
      render() { return null; }
    }

    const inst = new ReactiveComp({});
    inst.onMount?.();
    expect(document.title).toBe("Count: 0");
    count.set(5);
    await Promise.resolve();
    expect(document.title).toBe("Count: 5");
    inst.onUnmount?.();
  });

  it("stops tracking after onUnmount", async () => {
    const val = signal("a");

    @Head((self: StopComp) => ({ title: self.v() }))
    class StopComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      v = val;
      render() { return null; }
    }

    const inst = new StopComp({});
    inst.onMount?.();
    inst.onUnmount?.();
    val.set("b");
    await Promise.resolve();
    expect(document.title).not.toBe("b");
  });

  it("multiple instances — last mounted wins, cleanup restores previous", () => {
    const t1 = signal("Page A");
    const t2 = signal("Page B");

    @Head((self: CompA) => ({ title: self.t() }))
    class CompA extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      t = t1;
      render() { return null; }
    }

    @Head((self: CompB) => ({ title: self.t() }))
    class CompB extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      t = t2;
      render() { return null; }
    }

    const a = new CompA({});
    const b = new CompB({});
    a.onMount?.();
    expect(document.title).toBe("Page A");
    b.onMount?.();
    expect(document.title).toBe("Page B");
    b.onUnmount?.();
    expect(document.title).toBe("Page A");
    a.onUnmount?.();
  });

  it("full og: config is applied reactively", async () => {
    const slug = signal("hello");

    @Head((self: OGComp) => ({
      og: { title: `Post: ${self.s()}`, url: `https://site.com/${self.s()}` },
    }))
    class OGComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      s = slug;
      render() { return null; }
    }

    const inst = new OGComp({});
    inst.onMount?.();
    expect(document.querySelector('[property="og:title"]')?.getAttribute("content")).toBe("Post: hello");
    slug.set("world");
    await Promise.resolve();
    expect(document.querySelector('[property="og:title"]')?.getAttribute("content")).toBe("Post: world");
    inst.onUnmount?.();
  });

  it("getter is called only when deps change, not on every frame", async () => {
    const name = signal("Alice");
    const getter = vi.fn((self: SpyComp) => ({ title: self.n() }));

    @Head(getter)
    class SpyComp extends StatefulComponent {
      static __isComponent = true as const;
      static __isStateless = false;
      n = name;
      render() { return null; }
    }

    const inst = new SpyComp({});
    inst.onMount?.();
    expect(getter).toHaveBeenCalledTimes(1);
    name.set("Bob");
    await Promise.resolve();
    expect(getter).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    expect(getter).toHaveBeenCalledTimes(2); // no extra calls
    inst.onUnmount?.();
  });
});
