import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import {
  Router,
  RouterView,
  Link,
  type RouterInstance,
} from "@praxisjs/router";
import type { Children } from "@praxisjs/shared";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Layout shell ─────────────────────────────────────────────────────────────

interface AppLayoutProps {
  children?: Children;
}

@Component()
class AppLayout extends StatelessComponent<AppLayoutProps> {
  render() {
    return (
      <div style="display:flex;flex-direction:column;min-height:160px;font-family:sans-serif">
        <header style="display:flex;align-items:center;gap:6px;padding:10px 14px;background:#6d5bbd;color:#fff">
          <span style="font-weight:600;font-size:.9rem">MyApp</span>
          <div style="flex:1" />
          <Link to="/dashboard" activeClass="layout-link-active" style="font-size:.82rem;color:rgba(255,255,255,.8);text-decoration:none;padding:3px 8px;border-radius:4px">Dashboard</Link>
          <Link to="/settings"  activeClass="layout-link-active" style="font-size:.82rem;color:rgba(255,255,255,.8);text-decoration:none;padding:3px 8px;border-radius:4px">Settings</Link>
        </header>
        <main style="flex:1;padding:20px">
          {this.props.children}
        </main>
        <footer style="padding:8px 14px;font-size:.75rem;color:#9ca3af;border-top:1px solid #e5e7eb;text-align:right">
          Layout persistent across routes
        </footer>
      </div>
    );
  }
}

// ─── Pages ────────────────────────────────────────────────────────────────────

@Component()
class DashboardPage extends StatelessComponent {
  render() {
    return (
      <div>
        <h2 style="margin:0 0 8px;font-size:1rem;color:#374151">Dashboard</h2>
        <p style="margin:0;font-size:.85rem;color:#6b7280">Welcome back. Navigate to Settings using the header.</p>
      </div>
    );
  }
}

@Component()
class SettingsPage extends StatelessComponent {
  render() {
    return (
      <div>
        <h2 style="margin:0 0 8px;font-size:1rem;color:#374151">Settings</h2>
        <p style="margin:0;font-size:.85rem;color:#6b7280">Configure your preferences here.</p>
      </div>
    );
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

@Router([
  { path: "/dashboard", component: DashboardPage, layout: AppLayout },
  { path: "/settings",  component: SettingsPage,  layout: AppLayout },
])
@Component()
class LayoutApp extends StatefulComponent {
  @Router() router!: RouterInstance;

  onMount() {
    void this.router.replace("/dashboard");
  }

  render() {
    return (
      <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;min-width:340px">
        <RouterView />
      </div>
    );
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Router/Layout",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "Layout — children prop (header + footer shell)",
  render: () => <LayoutApp />,
};
