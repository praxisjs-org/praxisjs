import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Prop, OnCommand, createCommand } from "@praxisjs/decorators";
import type { Command } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class VideoPlayer extends StatefulComponent {
  @Prop() play?: Command;
  @Prop() pause?: Command;
  @Prop() seek?: Command<number>;

  @State() status: "playing" | "paused" = "paused";
  @State() position = 0;
  @State() log: string[] = [];

  @OnCommand("play")
  handlePlay() {
    this.status = "playing";
    this.log = ["▶ play", ...this.log.slice(0, 4)];
  }

  @OnCommand("pause")
  handlePause() {
    this.status = "paused";
    this.log = ["⏸ pause", ...this.log.slice(0, 4)];
  }

  @OnCommand("seek")
  handleSeek(time: number) {
    this.position = time;
    this.log = [`⏩ seek → ${time}s`, ...this.log.slice(0, 4)];
  }

  render() {
    return (
      <div style="padding:14px;border:1px solid #e5e7eb;border-radius:8px;font-family:sans-serif;min-width:240px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:1.5rem">{() => this.status === "playing" ? "▶" : "⏸"}</span>
          <div style="flex:1">
            <p style="margin:0;font-size:.85rem;font-weight:600">VideoPlayer</p>
            <p style="margin:0;font-size:.78rem;color:#9ca3af">
              {() => this.status} · {() => this.position}s
            </p>
          </div>
        </div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px">
          {() => this.log.length === 0
            ? <li style="font-size:.78rem;color:#d1d5db">No commands yet</li>
            : this.log.map((e, i) => (
              <li style={`font-size:.78rem;font-family:monospace;padding:3px 8px;border-radius:3px;background:${i === 0 ? "#ede9fe" : "#f5f5f5"}`}>{e}</li>
            ))
          }
        </ul>
      </div>
    );
  }
}

@Component()
class OnCommandDemo extends StatefulComponent {
  play = createCommand();
  pause = createCommand();
  seek = createCommand<number>();

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@OnCommand — imperative event bus</h3>
        <VideoPlayer play={this.play} pause={this.pause} seek={this.seek} />
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button
            style="padding:6px 14px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.play.trigger(); }}
          >▶ Play</button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.pause.trigger(); }}
          >⏸ Pause</button>
          {[0, 30, 60, 90].map((t) => (
            <button
              key={t}
              style="padding:6px 12px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
              onClick={() => { this.seek.trigger(t); }}
            >⏩ {t}s</button>
          ))}
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>createCommand()</code> returns a <code>Command</code> object.
          <code>@OnCommand('play')</code> subscribes the method on mount, unsubscribes on unmount.
          Useful for triggering imperative actions without prop drilling or events.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Decorators/Events/OnCommand",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const OnCommandStory: Story = {
  name: "@OnCommand — imperative event bus",
  render: () => <OnCommandDemo />,
};
