import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import {
  Router,
  RouterView,
  Link,
  Location,
  Meta,
  type RouterInstance,
  type RouteLocation,
  type RouteMeta,
} from "@praxisjs/router";
import type { Computed } from "@praxisjs/shared";
import type { StoryObj, Meta as StorybookMeta } from "@praxisjs/storybook";

// ─── Pages ────────────────────────────────────────────────────────────────────

@Component()
class HomePage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#374151">Home</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">Public page — no auth required.</p>
      </div>
    );
  }
}

@Component()
class DocsPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#374151">Docs</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">Documentation area.</p>
      </div>
    );
  }
}

@Component()
class DashboardPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#16a34a">Dashboard</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">Protected page — auth required.</p>
      </div>
    );
  }
}

@Component()
class SettingsPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#0891b2">Settings</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">Protected — admin only.</p>
      </div>
    );
  }
}

@Component()
class LoginPage extends StatefulComponent {
  render() {
    return (
      <div style="padding:20px;font-family:sans-serif">
        <h2 style="margin:0 0 8px;font-size:1.1rem;color:#dc2626">Login required</h2>
        <p style="margin:0;font-size:.88rem;color:#6b7280">
          Guard read <code>to.meta.requiresAuth</code> and redirected here.
        </p>
      </div>
    );
  }
}

// ─── Page title bar (reads @Meta) ─────────────────────────────────────────────

@Component()
class TitleBar extends StatefulComponent {
  @Meta() meta!: Computed<RouteMeta>;
  @Location() location!: RouteLocation;

  render() {
    return (
      <div style="padding:6px 14px;background:#1e1b4b;display:flex;align-items:center;gap:10px">
        <span style="font-size:.78rem;color:#a5b4fc;flex-shrink:0">Page title:</span>
        <strong style="font-size:.85rem;color:#e0e7ff;flex:1">
          {() => String(this.meta().title ?? "Untitled")}
        </strong>
        <span style="font-size:.72rem;color:#6366f1">
          {() => this.location().path}
        </span>
      </div>
    );
  }
}

// ─── Breadcrumb bar (reads location().meta) ───────────────────────────────────

@Component()
class BreadcrumbBar extends StatefulComponent {
  @Meta() meta!: Computed<RouteMeta>;

  render() {
    return (
      <div style="padding:5px 14px;background:#f8fafc;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:4px;font-size:.78rem">
        <span style="color:#9ca3af">Breadcrumb:</span>
        {() => {
          const crumbs = this.meta().breadcrumbs as string[] | undefined;
          if (!crumbs?.length) return <span style="color:#d1d5db">—</span>;
          return crumbs.map((c, i) => (
            <span key={i} style="display:flex;align-items:center;gap:4px">
              {i > 0 && <span style="color:#d1d5db">/</span>}
              <span style={`color:${i === crumbs.length - 1 ? "#374151" : "#9ca3af"};font-weight:${i === crumbs.length - 1 ? "600" : "400"}`}>{c}</span>
            </span>
          ));
        }}
      </div>
    );
  }
}

// ─── Auth state (module-level — simple simulation) ────────────────────────────

let isAuthenticated = false;
let isAdmin = false;

// ─── Nav bar ──────────────────────────────────────────────────────────────────

@Component()
class NavBar extends StatefulComponent {
  @Router() router!: RouterInstance;

  render() {
    return (
      <nav style="display:flex;gap:4px;padding:8px 14px;background:#fafafa;border-bottom:1px solid #e5e7eb;align-items:center;flex-wrap:wrap">
        <Link to="/" activeClass="nav-active" style="padding:5px 11px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151">Home</Link>
        <Link to="/docs" activeClass="nav-active" style="padding:5px 11px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151">Docs</Link>
        <Link to="/dashboard" activeClass="nav-active" style="padding:5px 11px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151">Dashboard</Link>
        <Link to="/settings" activeClass="nav-active" style="padding:5px 11px;border-radius:5px;font-size:.83rem;text-decoration:none;color:#374151">Settings</Link>
        <div style="flex:1" />
        <button
          style="padding:3px 10px;border-radius:5px;font-size:.75rem;border:1px solid #d1d5db;background:#fff;cursor:pointer"
          onClick={() => {
            isAuthenticated = !isAuthenticated;
            void this.router.push(isAuthenticated ? "/dashboard" : "/");
          }}
        >
          {isAuthenticated ? "Log out" : "Log in"}
        </button>
        <button
          style="padding:3px 10px;border-radius:5px;font-size:.75rem;border:1px solid #d1d5db;background:#fff;cursor:pointer"
          onClick={() => {
            isAdmin = !isAdmin;
            void this.router.push(isAdmin ? "/settings" : "/dashboard");
          }}
        >
          {isAdmin ? "Demote" : "Make admin"}
        </button>
      </nav>
    );
  }
}

// ─── Root app ─────────────────────────────────────────────────────────────────

@Router([
  {
    path: "/",
    name: "home",
    component: HomePage,
    meta: { title: "Home", breadcrumbs: ["Home"] },
  },
  {
    path: "/docs",
    name: "docs",
    component: DocsPage,
    meta: { title: "Documentation", breadcrumbs: ["Home", "Docs"] },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardPage,
    meta: {
      title: "Dashboard",
      requiresAuth: true,
      breadcrumbs: ["Home", "Dashboard"],
    },
    beforeEnter: (to) => {
      if (to.meta.requiresAuth && !isAuthenticated) return "/login";
      return true;
    },
  },
  {
    path: "/settings",
    name: "settings",
    component: SettingsPage,
    meta: {
      title: "Settings",
      requiresAuth: true,
      roles: ["admin"],
      breadcrumbs: ["Home", "Dashboard", "Settings"],
    },
    beforeEnter: (to) => {
      if (!isAuthenticated) return "/login";
      const roles = to.meta.roles as string[] | undefined;
      if (roles?.includes("admin") && !isAdmin) return "/login";
      return true;
    },
  },
  { path: "/login", component: LoginPage, meta: { title: "Login required" } },
])
@Component()
class MetaApp extends StatefulComponent {
  render() {
    return (
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;font-family:sans-serif;min-width:380px">
        <TitleBar />
        <NavBar />
        <BreadcrumbBar />
        <div style="min-height:130px">
          <RouterView />
        </div>
      </div>
    );
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: StorybookMeta = {
  title: "Ecosystem/Router/Route Meta",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "Route meta — title, breadcrumbs, requiresAuth, roles",
  render: () => <MetaApp />,
};
