import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose, State, getter } from "@praxisjs/decorators";
import { TimeAgo } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class TimeAgoDemo extends StatefulComponent {
  @State() postedAt = new Date(Date.now() - 3 * 60 * 1000);

  @Compose(TimeAgo, getter("postedAt"))
  timeAgo!: TimeAgo;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">TimeAgo — relative time</h3>
        <div style="padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;display:flex;flex-direction:column;gap:6px">
          <p style="margin:0;font-size:.85rem;color:#6b7280">Post created:</p>
          <p style="margin:0;font-size:1.1rem;font-weight:700;color:#374151">
            {() => this.timeAgo.value}
          </p>
          <p style="margin:0;font-size:.75rem;color:#d1d5db">
            {() => this.postedAt.toLocaleTimeString()}
          </p>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          {[1, 5, 30, 60].map((mins) => (
            <button
              key={mins}
              style="padding:5px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
              onClick={() => { this.postedAt = new Date(Date.now() - mins * 60 * 1000); }}
            >
              {mins}m ago
            </button>
          ))}
          <button
            style="padding:5px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.postedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); }}
          >
            2h ago
          </button>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Updates every minute automatically. Use <code>getter('propName')</code> when the composable
          needs a live getter instead of the property's current value.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Browser/TimeAgo",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const TimeAgoStory: Story = {
  name: "TimeAgo — relative time",
  render: () => <TimeAgoDemo />,
};
