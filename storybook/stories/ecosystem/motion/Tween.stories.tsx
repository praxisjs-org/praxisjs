import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import { Tween } from "@praxisjs/motion";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class TweenDemo extends StatefulComponent {
  @Tween({ duration: 600, easing: "easeOut" })
  progress = 0;

  @Tween({ duration: 400, easing: "easeInOut" })
  opacity = 1;

  @State() easing: "linear" | "easeOut" | "easeInCubic" | "bounce" | "elastic" = "easeOut";

  setProgress(value: number) {
    this.progress = value;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@Tween — duration-based animation</h3>

        <div>
          <div style="display:flex;justify-content:space-between;font-size:.82rem;color:#6b7280;margin-bottom:6px">
            <span>Progress</span>
            <span style="font-variant-numeric:tabular-nums">{() => Math.round(this.progress)}%</span>
          </div>
          <div style="height:12px;background:#f1f5f9;border-radius:99px;overflow:hidden">
            <div
              style={() => `height:100%;border-radius:99px;background:linear-gradient(90deg,#6d5bbd,#9b90e6);width:${this.progress}%;transition:none`}
            />
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap">
          {[0, 25, 50, 75, 100].map((v) => (
            <button
              key={v}
              style="padding:5px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
              onClick={() => { this.setProgress(v); }}
            >
              {v}%
            </button>
          ))}
        </div>

        <div>
          <p style="margin:0 0 6px;font-size:.82rem;color:#6b7280">Opacity tween</p>
          <div
            style={() => `padding:10px 14px;background:#ede9fe;border-radius:6px;font-size:.88rem;color:#5b21b6;text-align:center;opacity:${this.opacity}`}
          >
            {() => `Opacity: ${this.opacity.toFixed(2)}`}
          </div>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button
              style="flex:1;padding:5px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
              onClick={() => { this.opacity = 0; }}
            >
              Fade out
            </button>
            <button
              style="flex:1;padding:5px;border-radius:5px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.82rem"
              onClick={() => { this.opacity = 1; }}
            >
              Fade in
            </button>
          </div>
        </div>

        <p style="margin:0;font-size:.78rem;color:#aaa">
          Assign any value — the field animates automatically.
          Reading it returns the current interpolated value.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/Motion/Tween",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const TweenStory: Story = {
  name: "@Tween — duration-based animation",
  render: () => <TweenDemo />,
};
