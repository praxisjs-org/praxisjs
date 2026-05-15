import { StatefulComponent, Composable } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { signal, computed } from "@praxisjs/core/internal";
import type { Meta, StoryObj } from "@praxisjs/storybook";

class CounterComposable extends Composable {
  declare count: number;
  declare doubled: number;
  declare increment: () => void;
  declare decrement: () => void;
  declare reset: () => void;

  constructor(private readonly initial = 0) {
    super();
  }

  setup() {
    const count = signal(this.initial);
    const doubled = computed(() => count() * 2);

    return {
      count,
      doubled,
      increment: () => count.update((n: number) => n + 1),
      decrement: () => count.update((n: number) => n - 1),
      reset: () => count.set(this.initial),
    };
  }
}

@Component()
class CounterComposableDemo extends StatefulComponent {
  @Compose(CounterComposable, 10)
  counter!: CounterComposable;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">CounterComposable — signals + methods</h3>
        <div style="text-align:center">
          <p style="font-size:3.5rem;font-weight:800;margin:0;color:#6d5bbd;font-variant-numeric:tabular-nums;line-height:1">
            {() => this.counter.count}
          </p>
          <p style="margin:4px 0 0;font-size:.82rem;color:#9ca3af">
            doubled: {() => this.counter.doubled}
          </p>
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button
            style="padding:7px 16px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.counter.decrement(); }}
          >−1</button>
          <button
            style="padding:7px 16px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer"
            onClick={() => { this.counter.increment(); }}
          >+1</button>
          <button
            style="padding:7px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;color:#9ca3af;font-size:.85rem"
            onClick={() => { this.counter.reset(); }}
          >Reset</button>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>@Compose(CounterComposable, 10)</code> — the second argument (10) is the initial count.
          <code>setup()</code> returns signals, computeds, and plain functions — all exposed as properties.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Composables/CounterComposable",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const CounterStory: Story = {
  name: "CounterComposable — signals + computed + methods",
  render: () => <CounterComposableDemo />,
};
