// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signal } from "@praxisjs/core/internal";
import { StatefulComponent } from "@praxisjs/core";

import { Head } from "../index";
import { pushHead, removeHead, _resetHead, headVersion } from "../head-stack";

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

  it("removeHead with a non-existent id is a no-op (idx < 0 branch)", () => {
    const id = Symbol("never-pushed");
    // _apply() still runs but the stack stays empty
    expect(() => removeHead(id)).not.toThrow();
    expect(document.querySelectorAll("[data-praxis-head]").length).toBe(0);
  });

  it("_apply restores title to '' when _initialTitle is undefined and stack is empty", () => {
    // _resetHead leaves _initialTitle = undefined; calling removeHead on a missing id
    // triggers _apply with an empty stack and undefined _initialTitle → title = "" fallback.
    const id = Symbol("missing");
    document.title = "should-be-cleared";
    removeHead(id); // idx < 0 → no splice; _apply runs → empty stack, _initialTitle = undefined
    expect(document.title).toBe("");
  });

  it("adds preload link with href and as", () => {
    const id = Symbol();
    pushHead(id, { preload: [{ href: "/fonts/inter.woff2", as: "font" }] });
    const el = document.querySelector<HTMLLinkElement>('link[rel="preload"]');
    expect(el?.href).toContain("/fonts/inter.woff2");
    expect(el?.getAttribute("as")).toBe("font");
  });

  it("adds preload link with type and crossOrigin", () => {
    const id = Symbol();
    pushHead(id, {
      preload: [{ href: "/fonts/inter.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" }],
    });
    const el = document.querySelector<HTMLLinkElement>('link[rel="preload"]');
    expect(el?.type).toBe("font/woff2");
    expect(el?.crossOrigin).toBe("anonymous");
  });

  it("adds multiple preload links", () => {
    const id = Symbol();
    pushHead(id, {
      preload: [
        { href: "/style.css", as: "style" },
        { href: "/app.js", as: "script" },
      ],
    });
    const els = document.querySelectorAll('link[rel="preload"]');
    expect(els.length).toBe(2);
    expect(els[0].getAttribute("as")).toBe("style");
    expect(els[1].getAttribute("as")).toBe("script");
  });

  it("adds prefetch link with href", () => {
    const id = Symbol();
    pushHead(id, { prefetch: [{ href: "/about" }] });
    const el = document.querySelector<HTMLLinkElement>('link[rel="prefetch"]');
    expect(el?.href).toContain("/about");
  });

  it("adds prefetch link with optional as", () => {
    const id = Symbol();
    pushHead(id, { prefetch: [{ href: "/chunk.js", as: "script" }] });
    const el = document.querySelector<HTMLLinkElement>('link[rel="prefetch"]');
    expect(el?.getAttribute("as")).toBe("script");
  });

  it("adds multiple prefetch links", () => {
    const id = Symbol();
    pushHead(id, {
      prefetch: [
        { href: "/about" },
        { href: "/contact" },
      ],
    });
    const els = document.querySelectorAll('link[rel="prefetch"]');
    expect(els.length).toBe(2);
  });

  it("cleans up preload and prefetch on removeHead", () => {
    const id = Symbol();
    pushHead(id, {
      preload: [{ href: "/font.woff2", as: "font" }],
      prefetch: [{ href: "/next-page" }],
    });
    removeHead(id);
    expect(document.querySelector('link[rel="preload"]')).toBeNull();
    expect(document.querySelector('link[rel="prefetch"]')).toBeNull();
  });

  it("meta tag with neither name nor property is silently skipped", () => {
    const id = Symbol();
    pushHead(id, { meta: [{ content: "orphan-content" }] });
    // Neither _metaName nor _metaProp should be called
    const all = document.querySelectorAll("[data-praxis-head]");
    const hasOrphan = Array.from(all).some((el) =>
      el.getAttribute("content") === "orphan-content",
    );
    expect(hasOrphan).toBe(false);
    removeHead(id);
  });

  it("omits undefined og fields", () => {
    const id = Symbol();
    pushHead(id, { og: { title: "T" } });
    expect(document.querySelector('[property="og:image"]')).toBeNull();
    expect(document.querySelector('[property="og:title"]')?.getAttribute("content")).toBe("T");
  });
});

// ─── SSR guards ───────────────────────────────────────────────────────────────

describe("SSR guards — no DOM operations when document is undefined", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pushHead is a no-op when document is undefined", () => {
    const versionBefore = headVersion();
    vi.stubGlobal("document", undefined);
    const id = Symbol();
    expect(() => pushHead(id, { title: "SSR" })).not.toThrow();
    // headVersion must NOT have changed (function returned early)
    expect(headVersion()).toBe(versionBefore);
  });

  it("removeHead is a no-op when document is undefined", () => {
    vi.stubGlobal("document", undefined);
    const id = Symbol();
    expect(() => removeHead(id)).not.toThrow();
  });

  it("_resetHead skips DOM cleanup when document is undefined", () => {
    vi.stubGlobal("document", undefined);
    expect(() => _resetHead()).not.toThrow();
  });
});

describe("_resetHead — DOM cleanup", () => {
  it("removes managed elements from document.head when called with elements present", () => {
    const id = Symbol();
    pushHead(id, { title: "Before Reset", description: "desc" });
    expect(document.querySelectorAll("[data-praxis-head]").length).toBeGreaterThan(0);

    // Call _resetHead WITHOUT clearing head.innerHTML first — exercises the forEach
    _resetHead();
    expect(document.querySelectorAll("[data-praxis-head]").length).toBe(0);
  });
});

// ─── @Head decorator ──────────────────────────────────────────────────────────

// All decorated classes at module scope for correct TypeScript inference.

@Head({ title: "Static Title", description: "Static desc" })
class StaticComp extends StatefulComponent {
  render() { return null; }
}
Object.assign(StaticComp, { __isComponent: true as const, __isStateless: false });

@Head({ title: "Before" })
class BeforeComp extends StatefulComponent {
  render() { return null; }
}
Object.assign(BeforeComp, { __isComponent: true as const, __isStateless: false });

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
      n = count;
      render() { return null; }
    }
    Object.assign(ReactiveComp, { __isComponent: true as const, __isStateless: false });

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
      v = val;
      render() { return null; }
    }
    Object.assign(StopComp, { __isComponent: true as const, __isStateless: false });

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
      t = t1;
      render() { return null; }
    }
    Object.assign(CompA, { __isComponent: true as const, __isStateless: false });

    @Head((self: CompB) => ({ title: self.t() }))
    class CompB extends StatefulComponent {
      t = t2;
      render() { return null; }
    }
    Object.assign(CompB, { __isComponent: true as const, __isStateless: false });

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
      s = slug;
      render() { return null; }
    }
    Object.assign(OGComp, { __isComponent: true as const, __isStateless: false });

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
      n = name;
      render() { return null; }
    }
    Object.assign(SpyComp, { __isComponent: true as const, __isStateless: false });

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
