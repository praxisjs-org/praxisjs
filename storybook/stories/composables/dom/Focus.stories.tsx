import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { Focus } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class FocusDemo extends StatefulComponent {
  inputRef = { current: null as HTMLInputElement | null };

  @Compose(Focus, "inputRef")
  focus!: Focus;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">Focus — reactive focus state</h3>
        <input
          style={() => `padding:10px 14px;border-radius:8px;font-family:inherit;font-size:.95rem;border:2px solid ${this.focus.focused ? "#6d5bbd" : "#e5e7eb"};outline:none;transition:border-color .15s`}
          placeholder="Click to focus…"
          ref={(el: HTMLInputElement) => { this.inputRef.current = el; }}
        />
        <div style={() => `padding:10px 14px;border-radius:8px;font-size:.88rem;font-weight:600;text-align:center;background:${this.focus.focused ? "#ede9fe" : "#f5f5f5"};color:${this.focus.focused ? "#5b21b6" : "#9ca3af"};transition:all .15s`}>
          {() => this.focus.focused ? "Input is focused" : "Input is blurred"}
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Compose(Focus, 'inputRef')</code> tracks focus on the element referenced by <code>inputRef</code>.
          The string argument resolves to the instance property at bind time.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/DOM/Focus",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const FocusStory: Story = {
  name: "Focus — focus state",
  render: () => <FocusDemo />,
};
