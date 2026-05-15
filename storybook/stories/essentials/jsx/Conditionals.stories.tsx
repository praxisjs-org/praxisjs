import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class ConditionalDemo extends StatefulComponent {
  @State() loading = false;
  @State() error = false;
  @State() data: string[] | null = null;

  load() {
    this.loading = true;
    this.error = false;
    this.data = null;
    setTimeout(() => {
      this.loading = false;
      this.data = ["alpha", "beta", "gamma"];
    }, 800);
  }

  fail() {
    this.loading = true;
    this.error = false;
    this.data = null;
    setTimeout(() => {
      this.loading = false;
      this.error = true;
    }, 600);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">JSX — conditional rendering</h3>
        <div style="display:flex;gap:8px">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.load(); }}
          >Load</button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #fca5a5;color:#dc2626;background:#fff;cursor:pointer"
            onClick={() => { this.fail(); }}
          >Fail</button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#888"
            onClick={() => { this.data = null; this.error = false; this.loading = false; }}
          >Reset</button>
        </div>
        {() => this.loading && (
          <p style="margin:0;color:#9ca3af;font-size:.88rem">Loading…</p>
        )}
        {() => this.error && (
          <div style="padding:8px 12px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:.85rem">
            Something went wrong.
          </div>
        )}
        {() => this.data && (
          <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px">
            {() => this.data!.map((d) => (
              <li style="padding:5px 10px;background:#f5f5f5;border-radius:4px;font-size:.88rem">{d}</li>
            ))}
          </ul>
        )}
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>{`{() => cond && <Component />}`}</code> — renders only when truthy.
          <br />
          <code>{`{() => x ? <A /> : <B />}`}</code> — ternary for two branches.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/JSX/Conditionals",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Conditionals: Story = {
  name: "Conditional rendering",
  render: () => <ConditionalDemo />,
};
