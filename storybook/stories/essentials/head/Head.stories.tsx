import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Head, headVersion } from "@praxisjs/head";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Simulated "pages" with different @Head configs ──────────────────────────

const PAGES = [
  {
    key: "home",
    label: "Home",
    config: {
      title: "Home — My Site",
      description: "Welcome to my site",
      og: { title: "Home — My Site", type: "website" },
    },
  },
  {
    key: "about",
    label: "About",
    config: {
      title: "About — My Site",
      description: "Learn more about us",
      og: { title: "About Us", type: "website" },
    },
  },
  {
    key: "post",
    label: "Blog post",
    config: {
      title: "Understanding Signals — My Blog",
      description: "A deep dive into fine-grained reactivity.",
      canonical: "https://mysite.com/posts/understanding-signals",
      og: {
        title: "Understanding Signals",
        description: "A deep dive into fine-grained reactivity.",
        image: "https://mysite.com/og/signals.jpg",
        url: "https://mysite.com/posts/understanding-signals",
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: "Understanding Signals",
        image: "https://mysite.com/og/signals.jpg",
      },
    },
  },
] as const;

type PageKey = (typeof PAGES)[number]["key"];

// ─── Head inspector component (reads live from document.head) ─────────────────

@Component()
class HeadInspector extends StatefulComponent {
  meta(name: string) {
    return (
      document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ??
      document.querySelector<HTMLMetaElement>(`meta[property="${name}"]`)?.content ??
      "—"
    );
  }

  row(label: string, getValue: () => string) {
    return (
      <tr>
        <td style="padding:5px 10px 5px 0;color:#6b7280;font-size:.78rem;white-space:nowrap">{label}</td>
        <td style="padding:5px 0;font-size:.78rem;color:#111827;word-break:break-all">
          {() => { void headVersion(); return getValue(); }}
        </td>
      </tr>
    );
  }

  render() {
    return (
      <div style="padding:12px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px">
        <p style="margin:0 0 8px;font-size:.78rem;font-weight:600;color:#374151">Live document.head</p>
        <table style="border-collapse:collapse;width:100%">
          <tbody>
            {this.row("title",         () => document.title)}
            {this.row("description",   () => this.meta("description"))}
            {this.row("og:title",      () => this.meta("og:title"))}
            {this.row("og:description",() => this.meta("og:description"))}
            {this.row("og:type",       () => this.meta("og:type"))}
            {this.row("og:image",      () => this.meta("og:image"))}
            {this.row("twitter:card",  () => this.meta("twitter:card"))}
            {this.row("canonical",     () => document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? "—")}
          </tbody>
        </table>
      </div>
    );
  }
}

// ─── Page components — each declares its own @Head ───────────────────────────

@Head(PAGES[0].config)
@Component()
class HomePageDemo extends StatefulComponent {
  render() {
    return (
      <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;color:#374151">
        <strong>Home page</strong>
        <p style="margin:4px 0 0;font-size:.8rem;color:#6b7280">Static config — no reactive deps.</p>
      </div>
    );
  }
}

@Head(PAGES[1].config)
@Component()
class AboutPageDemo extends StatefulComponent {
  render() {
    return (
      <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;color:#374151">
        <strong>About page</strong>
        <p style="margin:4px 0 0;font-size:.8rem;color:#6b7280">Static config — different og:title.</p>
      </div>
    );
  }
}

@Head(PAGES[2].config)
@Component()
class BlogPostDemo extends StatefulComponent {
  render() {
    return (
      <div style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:.85rem;color:#374151">
        <strong>Blog post page</strong>
        <p style="margin:4px 0 0;font-size:.8rem;color:#6b7280">Full og:*, twitter:*, canonical.</p>
      </div>
    );
  }
}

// ─── Reactive @Head demo ──────────────────────────────────────────────────────

@Head((self: ReactivePageDemo) => ({
  title: `${self.name()} — My Site`,
  description: `Profile of ${self.name()}`,
  og: { title: self.name(), type: "profile" },
}))
@Component()
class ReactivePageDemo extends StatefulComponent {
  @State() _name = "Alice";

  name() {
    return this._name;
  }

  render() {
    return (
      <div style="padding:14px 16px;border:1px solid #bae6fd;border-radius:8px;background:#f0f9ff;display:flex;flex-direction:column;gap:8px">
        <strong style="font-size:.85rem;color:#374151">Reactive page</strong>
        <p style="margin:0;font-size:.8rem;color:#6b7280">
          Title updates as you type:
        </p>
        <input
          style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:.85rem"
          value={() => this._name}
          onInput={(e: Event) => {
            this._name = (e.target as HTMLInputElement).value;
          }}
        />
      </div>
    );
  }
}

// ─── Container ────────────────────────────────────────────────────────────────

@Component()
class HeadDemo extends StatefulComponent {
  @State() activePage: PageKey | "reactive" = "home";

  setPage(page: PageKey | "reactive") {
    this.activePage = page;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;max-width:520px">
        <h3 style="margin:0;font-size:1rem">@Head — reactive document head</h3>

        <div style="display:flex;flex-wrap:wrap;gap:8px">
          {(["home", "about", "post", "reactive"] as const).map((key) => (
            <button
              style={() =>
                `padding:6px 14px;border-radius:6px;font-size:.82rem;cursor:pointer;border:1px solid ${this.activePage === key ? "#6d5bbd" : "#e5e7eb"};background:${this.activePage === key ? "#6d5bbd" : "#fff"};color:${this.activePage === key ? "#fff" : "#374151"}`
              }
              onClick={() => { this.setPage(key); }}
            >
              {key === "home" ? "Home" : key === "about" ? "About" : key === "post" ? "Blog post" : "Reactive"}
            </button>
          ))}
        </div>

        {() => this.activePage === "home" && <HomePageDemo />}
        {() => this.activePage === "about" && <AboutPageDemo />}
        {() => this.activePage === "post" && <BlogPostDemo />}
        {() => this.activePage === "reactive" && <ReactivePageDemo />}

        <HeadInspector />

        <div style="padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.78rem;color:#0369a1;line-height:1.6">
          <strong>Switch pages</strong> to see the head update. Each page component
          declares <code>@Head</code>; when it unmounts the previous entry is restored.
          The "Reactive" tab updates the title as you type via signal tracking.
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

export const HeadStory: Story = {
  name: "@Head — reactive document head",
  render: () => <HeadDemo />,
};
