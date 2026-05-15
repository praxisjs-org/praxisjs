import { StatefulComponent } from "@praxisjs/core";
import { Component, State, When } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class WhenDemo extends StatefulComponent {
  @State() data: string[] | null = null;
  @State() log: string[] = [];
  @State() loading = false;

  @When("data")
  onFirstLoad() {
    this.log = [...this.log, `@When fired once — data arrived: [${this.data!.join(", ")}]`];
  }

  loadData() {
    this.loading = true;
    setTimeout(() => {
      this.data = ["alpha", "beta", "gamma"];
      this.loading = false;
    }, 800);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:10px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@When — fires exactly once</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            disabled={() => this.loading || this.data !== null}
            onClick={() => { this.loadData(); }}
          >
            {() => this.loading ? "Loading…" : "Load data"}
          </button>
          {() => this.data !== null && (
            <button
              style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
              onClick={() => {
                this.data = [...(this.data ?? []), `item-${(this.data?.length ?? 0) + 1}`];
                this.log = [...this.log, "(data changed again — @When does NOT re-fire)"];
              }}
            >
              Change data again
            </button>
          )}
        </div>
        {() => this.data !== null && (
          <ul style="margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:4px">
            {() => (this.data ?? []).map((d) => (
              <li style="padding:3px 10px;background:#ede9fe;color:#5b21b6;border-radius:99px;font-size:.8rem;font-weight:600">{d}</li>
            ))}
          </ul>
        )}
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">
          {() => this.log.map((entry) => (
            <li style="padding:5px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;font-size:.8rem;color:#166534">{entry}</li>
          ))}
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@When('data')</code> fires the first time <code>data</code> becomes truthy, then never again.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Watchers/When",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const WhenOnce: Story = {
  name: "@When — fires exactly once",
  render: () => <WhenDemo />,
};
