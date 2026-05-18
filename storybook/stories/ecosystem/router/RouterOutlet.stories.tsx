import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import {
  Router,
  RouterView,
  RouterOutlet,
  Link,
  type RouterInstance,
} from "@praxisjs/router";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Sidebar layout ───────────────────────────────────────────────────────────

@Component()
class SidebarLayout extends StatelessComponent {
  render() {
    return (
      <div style="display:flex;min-height:160px;font-family:sans-serif">
        <aside style="width:140px;background:#f3f4f6;border-right:1px solid #e5e7eb;padding:12px 0">
          <p style="margin:0 0 8px;padding:0 14px;font-size:.72rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Docs</p>
          <Link to="/docs/guide"    activeClass="sidebar-active" style="display:block;padding:6px 14px;font-size:.83rem;color:#374151;text-decoration:none">Guide</Link>
          <Link to="/docs/api"      activeClass="sidebar-active" style="display:block;padding:6px 14px;font-size:.83rem;color:#374151;text-decoration:none">API</Link>
          <Link to="/docs/examples" activeClass="sidebar-active" style="display:block;padding:6px 14px;font-size:.83rem;color:#374151;text-decoration:none">Examples</Link>
        </aside>
        <div style="flex:1;padding:16px">
          <RouterOutlet />
        </div>
      </div>
    );
  }
}

// ─── Pages ────────────────────────────────────────────────────────────────────

@Component()
class GuidePage extends StatelessComponent {
  render() { return <p style="margin:0;font-size:.88rem;color:#374151">Guide content — the sidebar stays mounted between routes.</p>; }
}

@Component()
class ApiPage extends StatelessComponent {
  render() { return <p style="margin:0;font-size:.88rem;color:#374151">API reference content.</p>; }
}

@Component()
class ExamplesPage extends StatelessComponent {
  render() { return <p style="margin:0;font-size:.88rem;color:#374151">Examples content.</p>; }
}

// ─── App ──────────────────────────────────────────────────────────────────────

@Router([
  {
    path: "/docs",
    component: SidebarLayout,
    children: [
      { path: "/guide",    component: GuidePage },
      { path: "/api",      component: ApiPage },
      { path: "/examples", component: ExamplesPage },
    ],
  },
])
@Component()
class OutletApp extends StatefulComponent {
  @Router() router!: RouterInstance;

  onMount() {
    void this.router.replace("/docs/guide");
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
  title: "Ecosystem/Router/Outlet",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "RouterOutlet — sidebar layout with nested routes",
  render: () => <OutletApp />,
};
