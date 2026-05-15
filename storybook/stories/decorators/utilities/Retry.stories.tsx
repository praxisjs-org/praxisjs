import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Retry } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class RetryDemo extends StatefulComponent {
  @State() log: string[] = [];
  @State() running = false;
  @State() successRate = 30;

  @Retry(4, {
    delay: 400,
    backoff: 2,
    onRetry: (err: Error, attempt: number) => {
      console.log(`retry #${attempt}:`, err.message);
    },
  })
  async saveData(label: string): Promise<string> {
    if (Math.random() * 100 > this.successRate)
      throw new Error("Network error");
    return `Saved "${label}"`;
  }

  async run() {
    this.running = true;
    const label = `data-${Date.now() % 10000}`;
    this.log = [`Calling saveData("${label}")…`, ...this.log.slice(0, 6)];
    try {
      const result = await this.saveData(label);
      this.log = [`✅ ${result}`, ...this.log.slice(0, 6)];
    } catch (e) {
      this.log = [
        `❌ Failed after 4 attempts: ${(e as Error).message}`,
        ...this.log.slice(0, 6),
      ];
    }
    this.running = false;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">
          @Retry(4) — auto-retry on failure
        </h3>

        <label style="display:flex;align-items:center;gap:8px;font-size:.9rem">
          Success rate
          <input
            type="range"
            min="0"
            max="100"
            style="flex:1"
            value={() => this.successRate}
            onInput={(e: Event) => {
              this.successRate = Number((e.target as HTMLInputElement).value);
            }}
          />
          <span style="min-width:4ch;font-variant-numeric:tabular-nums">
            {() => this.successRate}%
          </span>
        </label>

        <button
          disabled={() => this.running}
          style="padding:7px 18px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;align-self:start"
          onClick={() => { void this.run(); }}
        >
          {() => (this.running ? "Retrying…" : "Save data")}
        </button>

        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">
          {() =>
            this.log.map((entry, i) => (
              <li
                style={`padding:5px 10px;border-radius:4px;font-size:.8rem;font-family:monospace;background:${i === 0 ? (entry.startsWith("✅") ? "#f0fdf4" : entry.startsWith("❌") ? "#fef2f2" : "#ede9fe") : "#f5f5f5"};color:${i === 0 ? (entry.startsWith("✅") ? "#166534" : entry.startsWith("❌") ? "#b91c1c" : "#374151") : "#374151"}`}
              >
                {entry}
              </li>
            ))
          }
        </ul>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Retry(4, &#123; delay: 400, backoff: 2 &#125;)</code> —
          retries up to 4 times.
          <code>backoff: 2</code> multiplies the delay by 2 on each attempt
          (400ms → 800ms → 1600ms).
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Utilities/Retry",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const RetryStory: Story = {
  name: "@Retry — auto-retry on failure",
  render: () => <RetryDemo />,
};
