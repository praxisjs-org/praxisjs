import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Bind } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class BindDemo extends StatefulComponent {
  @State() log: string[] = [];

  @Bind()
  handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      this.log = [`[${e.key}] key caught via @Bind`, ...this.log.slice(0, 4)];
    }
  }

  onMount() {
    window.addEventListener("keydown", this.handleKeyDown);
  }

  onUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">
          @Bind — auto-bound method reference
        </h3>
        <div style="padding:12px;background:#f8fafc;border:1px dashed #e5e7eb;border-radius:6px;font-size:.85rem;color:#6b7280;text-align:center">
          Press{" "}
          <kbd style="padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;background:#fff">
            Esc
          </kbd>{" "}
          <kbd style="padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;background:#fff">
            Enter
          </kbd>{" "}
          or{" "}
          <kbd style="padding:2px 6px;border:1px solid #e5e7eb;border-radius:4px;background:#fff">
            Space
          </kbd>{" "}
          anywhere
        </div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px">
          {() =>
            this.log.length === 0 ? (
              <li style="font-size:.82rem;color:#aaa">
                Key events will appear here…
              </li>
            ) : (
              this.log.map((entry, i) => (
                <li
                  style={`padding:5px 10px;border-radius:4px;font-size:.82rem;font-family:monospace;background:${i === 0 ? "#ede9fe" : "#f5f5f5"}`}
                >
                  {entry}
                </li>
              ))
            )
          }
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Without <code>@Bind()</code>, passing <code>this.handleKeyDown</code>{" "}
          to <code>addEventListener</code> would lose <code>this</code>.
          <code>@Bind</code> binds on first access — no arrow function wrapper needed.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Utilities/Bind",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const BindStory: Story = {
  name: "@Bind — auto-bound method",
  render: () => <BindDemo />,
};
