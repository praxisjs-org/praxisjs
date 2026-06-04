import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Head, headVersion } from "@praxisjs/head";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Preload / Prefetch inspector ─────────────────────────────────────────────

@Component()
class PreloadInspector extends StatefulComponent {
  links(rel: string): HTMLLinkElement[] {
    return Array.from(
      document.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"][data-praxis-head]`),
    );
  }

  row(rel: string) {
    return (
      <div>
        {() => {
          void headVersion();
          const items = this.links(rel);
          if (items.length === 0) {
            return (
              <p style="margin:2px 0;font-size:.78rem;color:#9ca3af;font-style:italic">none</p>
            );
          }
          return items.map((el) => (
            <p style="margin:2px 0;font-size:.78rem;color:#111827;word-break:break-all">
              <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px">{el.getAttribute("as") ?? "—"}</code>
              {" "}{el.getAttribute("href")}
              {el.crossOrigin ? <span style="color:#6b7280"> [{el.crossOrigin}]</span> : null}
              {el.type ? <span style="color:#6b7280"> ({el.type})</span> : null}
            </p>
          ));
        }}
      </div>
    );
  }

  render() {
    return (
      <div style="padding:12px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px">
        <p style="margin:0 0 8px;font-size:.78rem;font-weight:600;color:#374151">Live document.head — managed link tags</p>
        <table style="border-collapse:collapse;width:100%">
          <tbody>
            <tr>
              <td style="padding:5px 10px 5px 0;color:#6b7280;font-size:.78rem;white-space:nowrap;vertical-align:top">preload</td>
              <td style="padding:5px 0">{this.row("preload")}</td>
            </tr>
            <tr>
              <td style="padding:5px 10px 5px 0;color:#6b7280;font-size:.78rem;white-space:nowrap;vertical-align:top">prefetch</td>
              <td style="padding:5px 0">{this.row("prefetch")}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

// ─── Page components ──────────────────────────────────────────────────────────

@Head({
  title: "Home — My Site",
  preload: [
    { href: "/fonts/inter.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
    { href: "/hero.jpg", as: "image" },
  ],
})
@Component()
class HomeWithPreload extends StatefulComponent {
  render() {
    return (
      <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;color:#374151">
        <strong>Home page</strong>
        <p style="margin:4px 0 0;font-size:.8rem;color:#6b7280">
          Preloads Inter font (woff2, crossorigin) and hero image.
        </p>
      </div>
    );
  }
}

@Head({
  title: "Blog — My Site",
  preload: [{ href: "/fonts/inter.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" }],
  prefetch: [
    { href: "/posts/intro-to-signals" },
    { href: "/posts/reactivity-deep-dive" },
  ],
})
@Component()
class BlogWithPrefetch extends StatefulComponent {
  render() {
    return (
      <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;color:#374151">
        <strong>Blog listing page</strong>
        <p style="margin:4px 0 0;font-size:.8rem;color:#6b7280">
          Preloads font + prefetches the two most-likely next pages.
        </p>
      </div>
    );
  }
}

// ─── Reactive preload demo ────────────────────────────────────────────────────

@Head((self: ReactivePreloadDemo) => ({
  title: `${self.page()} — My Site`,
  preload: [{ href: `/images/${self.page()}.jpg`, as: "image" }],
  prefetch: [{ href: `/pages/${self.nextPage()}` }],
}))
@Component()
class ReactivePreloadDemo extends StatefulComponent {
  @State() _page = "home";
  @State() _next = "about";

  page() { return this._page; }
  nextPage() { return this._next; }

  render() {
    return (
      <div style="padding:14px 16px;border:1px solid #bae6fd;border-radius:8px;background:#f0f9ff;display:flex;flex-direction:column;gap:8px">
        <strong style="font-size:.85rem;color:#374151">Reactive preload + prefetch</strong>
        <p style="margin:0;font-size:.8rem;color:#6b7280">Both change as you type:</p>
        <label style="font-size:.8rem;color:#374151">
          Current page:
          <input
            style="margin-left:8px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:.82rem"
            value={() => this._page}
            onInput={(e: Event) => { this._page = (e.target as HTMLInputElement).value; }}
          />
        </label>
        <label style="font-size:.8rem;color:#374151">
          Next page (prefetch):
          <input
            style="margin-left:8px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:.82rem"
            value={() => this._next}
            onInput={(e: Event) => { this._next = (e.target as HTMLInputElement).value; }}
          />
        </label>
      </div>
    );
  }
}

// ─── Container ────────────────────────────────────────────────────────────────

type Tab = "home" | "blog" | "reactive";

@Component()
class PreloadDemo extends StatefulComponent {
  @State() active: Tab = "home";

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:560px">
        <h3 style="margin:0;font-size:1rem">@Head — preload &amp; prefetch</h3>

        <div style="display:flex;gap:8px">
          {(["home", "blog", "reactive"] as Tab[]).map((tab) => (
            <button
              style={() =>
                `padding:6px 14px;border-radius:6px;font-size:.82rem;cursor:pointer;border:1px solid ${this.active === tab ? "#6d5bbd" : "#e5e7eb"};background:${this.active === tab ? "#6d5bbd" : "#fff"};color:${this.active === tab ? "#fff" : "#374151"}`
              }
              onClick={() => { this.active = tab; }}
            >
              {tab === "home" ? "Home" : tab === "blog" ? "Blog" : "Reactive"}
            </button>
          ))}
        </div>

        {() => this.active === "home" && <HomeWithPreload />}
        {() => this.active === "blog" && <BlogWithPrefetch />}
        {() => this.active === "reactive" && <ReactivePreloadDemo />}

        <PreloadInspector />

        <div style="padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.78rem;color:#0369a1;line-height:1.6">
          Switch tabs to see <code>preload</code> and <code>prefetch</code> links update.
          The "Reactive" tab updates both hrefs as you type.
        </div>
      </div>
    );
  }
}

// ─── Story ────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Essentials/Head",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const HeadPreloadStory: Story = {
  name: "@Head — preload & prefetch",
  render: () => <PreloadDemo />,
};
