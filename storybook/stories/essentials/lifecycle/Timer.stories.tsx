import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class TimerDemo extends StatefulComponent {
  @State() elapsed = 0;
  @State() running = false;
  private interval?: ReturnType<typeof setInterval>;

  onMount() {
    this.start();
  }

  onUnmount() {
    clearInterval(this.interval);
  }

  start() {
    this.running = true;
    this.interval = setInterval(() => { this.elapsed++; }, 1000);
  }

  stop() {
    this.running = false;
    clearInterval(this.interval);
  }

  reset() {
    this.stop();
    this.elapsed = 0;
  }

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;min-width:260px">
        <h3 style="margin:0;font-size:1rem">Lifecycle — onMount / onUnmount</h3>
        <p style="font-size:4rem;font-weight:800;margin:0;font-variant-numeric:tabular-nums;color:#6d5bbd;line-height:1">
          {() => this.elapsed}<span style="font-size:1.5rem;font-weight:400;color:#aaa">s</span>
        </p>
        <div style="display:flex;gap:8px">
          {() => this.running
            ? <button style="padding:7px 18px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer" onClick={() => { this.stop(); }}>Pause</button>
            : <button style="padding:7px 18px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer" onClick={() => { this.start(); }}>Resume</button>
          }
          <button
            style="padding:7px 18px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#888"
            onClick={() => { this.reset(); }}
          >
            Reset
          </button>
        </div>
        <div style="font-size:.8rem;color:#aaa;display:flex;flex-direction:column;gap:3px">
          <code>onMount()</code> — starts the interval when the component enters the DOM
          <code>onUnmount()</code> — clears the interval on removal (no memory leaks)
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Lifecycle/Timer",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Timer: Story = {
  name: "onMount / onUnmount — timer",
  render: () => <TimerDemo />,
};
