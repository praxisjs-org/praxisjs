import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Router, RouterView, Link, type RouterInstance } from "@praxisjs/router";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Pages ────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "intro",      label: "Introduction",  bg: "#ffffff", accent: "#374151" },
  { id: "background", label: "Background",    bg: "#f9fafb", accent: "#374151" },
  { id: "details",    label: "Implementation",bg: "#eff6ff", accent: "#1d4ed8" },
  { id: "benchmarks", label: "Benchmarks",    bg: "#f0fdf4", accent: "#15803d" },
  { id: "conclusion", label: "Conclusion",    bg: "#fef9f0", accent: "#92400e" },
] as const;

@Component()
class ArticlePage extends StatefulComponent {
  render() {
    return (
      <div style="font-family:sans-serif">
        {SECTIONS.map((s) => (
          <div
            key={s.id}
            id={s.id}
            style={`min-height:200px;padding:24px 20px;border-bottom:1px solid #e5e7eb;background:${s.bg}`}
          >
            <p style="margin:0 0 2px;font-size:.68rem;font-family:monospace;color:#9ca3af">#{s.id}</p>
            <h2 style={`margin:0 0 8px;font-size:1.05rem;color:${s.accent}`}>{s.label}</h2>
            <p style="margin:0;font-size:.84rem;color:#6b7280;line-height:1.6;max-width:420px">
              Scroll down, navigate away, then press ← Back — position is restored.
            </p>
          </div>
        ))}
      </div>
    );
  }
}

@Component()
class HomePage extends StatefulComponent {
  render() {
    return (
      <div style="padding:28px 20px;font-family:sans-serif;min-height:260px;display:flex;flex-direction:column;gap:8px">
        <h2 style="margin:0;font-size:1.05rem;color:#374151">Home</h2>
        <p style="margin:0;font-size:.85rem;color:#6b7280;line-height:1.6;max-width:440px">
          Click <strong>Article</strong>, scroll down, then <strong>← Back</strong> to restore scroll.
          Use the hash links to jump to a specific section.
        </p>
      </div>
    );
  }
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

@Component()
class NavBar extends StatefulComponent {
  @Router() router!: RouterInstance;

  render() {
    return (
      <nav style="display:flex;gap:4px;padding:8px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb;align-items:center;flex-wrap:wrap;position:sticky;top:0;z-index:10">
        <button
          style="padding:4px 11px;border-radius:5px;font-size:.82rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
          onClick={() => void this.router.push("/")}
        >
          Home
        </button>
        <button
          style="padding:4px 11px;border-radius:5px;font-size:.82rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
          onClick={() => void this.router.push("/article")}
        >
          Article
        </button>
        <Link
          to="/article#details"
          style="padding:4px 11px;border-radius:5px;font-size:.82rem;text-decoration:none;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8"
        >
          #details
        </Link>
        <Link
          to="/article#conclusion"
          style="padding:4px 11px;border-radius:5px;font-size:.82rem;text-decoration:none;border:1px solid #fed7aa;background:#fef9f0;color:#92400e"
        >
          #conclusion
        </Link>
        <div style="flex:1" />
        <button
          style="padding:4px 10px;border-radius:5px;font-size:.8rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
          onClick={() => this.router.back()}
        >
          ← Back
        </button>
        <button
          style="padding:4px 10px;border-radius:5px;font-size:.8rem;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#374151"
          onClick={() => this.router.forward()}
        >
          Forward →
        </button>
      </nav>
    );
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

@Router(
  [
    { path: "/",       component: HomePage },
    { path: "/article", component: ArticlePage },
    { path: "**",      component: HomePage },
  ],
  {
    scrollBehavior(to, _from, savedPosition) {
      if (savedPosition) return savedPosition          // back/forward: restore
      if (to.hash)       return { el: `#${to.hash}` } // hash: scroll to element
      return { top: 0 }                               // push: scroll to top
    },
  },
)
@Component()
class ScrollApp extends StatefulComponent {
  @Router() router!: RouterInstance;

  onMount() {
    void this.router.push("/");
  }

  render() {
    return (
      <div style="font-family:sans-serif;min-width:380px">
        <NavBar />
        <RouterView />
      </div>
    );
  }
}

// ─── Story ────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Router/Scroll Restoration",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "scrollBehavior — top · hash · savedPosition",
  render: () => <ScrollApp />,
};
