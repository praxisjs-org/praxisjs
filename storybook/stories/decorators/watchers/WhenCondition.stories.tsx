import { StatefulComponent } from "@praxisjs/core";
import { Component, State, When } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class WhenConditionDemo extends StatefulComponent {
  @State() score = 0;
  @State() log: string[] = [];

  @When("score", (s: number) => s >= 100)
  onWin() {
    this.log = [...this.log, `@When fired — score reached ${this.score}!`];
  }

  add(n: number) {
    this.score = this.score + n;
    if (this.score < 100) {
      this.log = [...this.log, `Score is now ${this.score} — condition not met yet.`];
    }
  }

  reset() {
    this.score = 0;
    this.log = [];
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">@When with condition</h3>

        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:2rem;font-weight:700;color:#6d5bbd;min-width:60px">
            {() => this.score}
          </div>
          <div style="flex:1;background:#e5e7eb;border-radius:99px;height:10px;overflow:hidden">
            <div style={() => `height:100%;border-radius:99px;background:${this.score >= 100 ? "#16a34a" : "#6d5bbd"};transition:width .2s;width:${Math.min(this.score, 100)}%`} />
          </div>
          <div style="font-size:.82rem;color:#6b7280;min-width:40px">/ 100</div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap">
          {[5, 10, 25].map((n) => (
            <button
              style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.875rem"
              disabled={() => this.score >= 100}
              onClick={() => { this.add(n); }}
            >
              +{n}
            </button>
          ))}
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.875rem"
            onClick={() => { this.reset(); }}
          >
            Reset
          </button>
        </div>

        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">
          {() => this.log.map((entry, i) => (
            <li
              key={String(i)}
              style={`padding:5px 10px;border-radius:4px;font-size:.8rem;${entry.includes("fired") ? "background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-weight:600" : "background:#f9fafb;border:1px solid #e5e7eb;color:#374151"}`}
            >
              {entry}
            </li>
          ))}
        </ul>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@When('score', s {"=>"} s {">="} 100)</code> fires exactly once when the score first reaches 100, regardless of how many subsequent changes occur.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Watchers/When Condition",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const WhenCondition: Story = {
  name: "@When — condition",
  render: () => <WhenConditionDemo />,
};
