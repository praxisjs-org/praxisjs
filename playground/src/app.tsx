import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Router, RouterView, Link, Lazy } from "@praxisjs/router";
import { Stylesheet, Styled, Themed } from "@praxisjs/css";

import { AppTokens, LightTheme } from "./tokens";
import { Home } from "./pages/home";
import About from "./pages/about";
import SyncedPage from "./pages/synced";
import DeepStatePage from "./pages/deep-state";
import PerformancePage from "./pages/performance";

// ─── App shell styles ─────────────────────────────────────────────────────────

class AppStyles extends Stylesheet {
  $app = this.css({ minHeight: "100vh", display: "flex", flexDirection: "column" });

  $nav = this.css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 28px",
    height: "62px",
    borderBottom: "1px solid var(--color-divider)",
    backgroundColor: "var(--color-bg-elv)",
    boxShadow: "var(--shadow-sm)",
    position: "sticky",
    top: "0",
    zIndex: 10,
  });

  $brand = this.css({ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" });

  $logo = this.css({ width: "30px", height: "30px", flexShrink: "0" });

  $brandName = this.css({
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--color-text)",
    letterSpacing: "-0.01em",
  });

  $links = this.css({ display: "flex", alignItems: "center", gap: "2px" });

  $link = this.css({
    padding: "6px 14px",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
    textDecoration: "none",
    transition: "color 0.15s, background-color 0.15s",
  })
    .hover({ color: "var(--color-brand)", backgroundColor: "var(--color-brand-soft)" })
    .on("&.active", { color: "var(--color-brand)", backgroundColor: "var(--color-brand-soft)" });

  $main = this.css({
    flex: "1",
    padding: "56px 28px",
    maxWidth: "860px",
    width: "100%",
    margin: "0 auto",
  });
}

// ─── App component ────────────────────────────────────────────────────────────

@Themed(AppTokens, LightTheme)
@Router([
  Home,
  About,
  SyncedPage,
  DeepStatePage,
  PerformancePage,
  { path: "/blog",       component: Lazy(() => import("./pages/blog")) },
  { path: "/blog/:slug", component: Lazy(() => import("./pages/post")) },
])
@Component()
export class App extends StatefulComponent {
  @Styled(AppStyles) $s!: AppStyles;

  render() {
    return (
      <div class={this.$s.$app}>
        <nav class={this.$s.$nav}>
          <Link to="/" class={this.$s.$brand}>
            <img src="/logo.svg" class={this.$s.$logo} alt="PraxisJS" />
            <span class={this.$s.$brandName}>PraxisJS</span>
          </Link>
          <div class={this.$s.$links}>
            <Link to="/"            class={this.$s.$link}>Home</Link>
            <Link to="/about"       class={this.$s.$link}>About</Link>
            <Link to="/synced"      class={this.$s.$link}>@Synced</Link>
            <Link to="/deep-state"  class={this.$s.$link}>@DeepState</Link>
            <Link to="/performance" class={this.$s.$link}>Performance</Link>
            <Link to="/blog"        class={this.$s.$link}>Blog</Link>
          </div>
        </nav>
        <main class={this.$s.$main}>
          <RouterView />
        </main>
      </div>
    );
  }
}
