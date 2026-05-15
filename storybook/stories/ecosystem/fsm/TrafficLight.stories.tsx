import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { StateMachine, Transition } from "@praxisjs/fsm";
import type { Meta, StoryObj } from "@praxisjs/storybook";

type LightState = "red" | "yellow" | "green";
type LightEvent = "NEXT";

@StateMachine<LightState, LightEvent>({
  initial: "red",
  states: {
    red:    { on: { NEXT: "green" } },
    green:  { on: { NEXT: "yellow" } },
    yellow: { on: { NEXT: "red" } },
  },
})
@Component()
class TrafficLight extends StatefulComponent {
  @Transition("machine", "NEXT")
  advance() {}

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:16px;font-family:sans-serif;align-items:center;min-width:200px">
        <h3 style="margin:0;font-size:1rem">Traffic Light FSM</h3>
        <div style="background:#1a1a2e;padding:16px;border-radius:12px;display:flex;flex-direction:column;gap:10px;align-items:center">
          {(["red", "yellow", "green"] as LightState[]).map((color) => (
            <div
              key={color}
              style={() => `width:50px;height:50px;border-radius:50%;background:${this.machine.is(color) ? color : "rgba(255,255,255,0.1)"};transition:background .25s;box-shadow:${this.machine.is(color) ? `0 0 20px ${color}` : "none"}`}
            />
          ))}
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <button
            style="padding:7px 18px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.advance(); }}
          >
            Next →
          </button>
          <span style="font-size:.9rem;font-weight:700;font-family:monospace">
            {() => this.machine.state()}
          </span>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa;text-align:center">
          red → green → yellow → red
          <br />
          <code>machine.state()</code> is reactive.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Ecosystem/FSM/TrafficLight",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const TrafficLightDemo: Story = {
  name: "@StateMachine — traffic light",
  render: () => <TrafficLight />,
};
