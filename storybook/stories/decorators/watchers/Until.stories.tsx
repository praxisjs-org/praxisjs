import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Until } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class UntilDemo extends StatefulComponent {
  @State() user: { name: string; role: string } | null = null;
  @State() log: string[] = [];
  @State() loading = false;

  @Until("user")
  waitForUser(): Promise<{ name: string; role: string }> { return Promise.resolve(null!); }

  async runProfile() {
    this.log = [...this.log, "waitForUser() called — awaiting…"];
    const user = await this.waitForUser();
    this.log = [...this.log, `resolved: ${user.name} (${user.role})`];
  }

  loadUser() {
    this.loading = true;
    setTimeout(() => {
      this.user = { name: "Alice", role: "admin" };
      this.loading = false;
    }, 900);
  }

  reset() {
    this.user = null;
    this.log = [];
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Until — await a reactive value</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { void this.runProfile(); }}
          >
            Call waitForUser()
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            disabled={() => this.loading || this.user !== null}
            onClick={() => { this.loadUser(); }}
          >
            {() => this.loading ? "Loading…" : "Set user"}
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#9ca3af"
            onClick={() => { this.reset(); }}
          >
            Reset
          </button>
        </div>
        {() => this.user && (
          <div style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:.85rem;color:#166534">
            User: <strong>{this.user!.name}</strong> ({this.user!.role})
          </div>
        )}
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">
          {() => this.log.map((entry, i) => (
            <li style={`padding:5px 10px;border-radius:4px;font-size:.8rem;font-family:monospace;background:${i === this.log.length - 1 ? "#ede9fe" : "#f5f5f5"}`}>
              {entry}
            </li>
          ))}
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Call <code>waitForUser()</code> first, then <em>Set user</em> — the promise resolves once the signal becomes truthy.
          Each call returns a fresh, independent promise.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Watchers/Until",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const UntilStory: Story = {
  name: "@Until — await a reactive value",
  render: () => <UntilDemo />,
};
