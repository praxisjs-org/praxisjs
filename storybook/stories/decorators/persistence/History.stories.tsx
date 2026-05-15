import { StatefulComponent } from "@praxisjs/core";
import { Component, State, History, HistoryOf } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class HistoryDemo extends StatefulComponent {
  @State()
  text = "Edit this text — changes are tracked for undo/redo.";

  @History("text", 50)
  textHistory!: HistoryOf<HistoryDemo, "text">;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">@History — undo / redo</h3>

        <textarea
          value={() => this.text}
          style="padding:10px;border:1px solid #ccc;border-radius:8px;min-height:90px;font-family:inherit;font-size:.9rem;resize:vertical"
          onInput={(e: Event) => { this.text = (e.target as HTMLTextAreaElement).value; }}
        />

        <div style="display:flex;gap:8px">
          <button
            disabled={() => !this.textHistory.canUndo()}
            style="padding:6px 16px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.textHistory.undo(); }}
          >
            ↩ Undo
          </button>
          <button
            disabled={() => !this.textHistory.canRedo()}
            style="padding:6px 16px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.textHistory.redo(); }}
          >
            Redo ↪
          </button>
        </div>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          {() => this.textHistory.canUndo() ? "History recorded — undo available." : "Start editing to record history."}
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Persistence/History",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const HistoryStory: Story = {
  name: "@History — undo / redo",
  render: () => <HistoryDemo />,
};
