import { StatefulComponent } from "@praxisjs/core";
import { signal } from "@praxisjs/core/internal";
import { ClassBehavior, Component, State, createClassDecorator } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

const mounted = signal(0);
const log = signal<string[]>([]);

class MountCounterBehavior extends ClassBehavior {
  constructor(private readonly name: string) { super(); }

  onMount() {
    mounted.update((n) => n + 1);
    log.update((lines) => [...lines.slice(-4), `${this.name} mounted`]);
  }

  onUnmount() {
    mounted.update((n) => n - 1);
    log.update((lines) => [...lines.slice(-4), `${this.name} unmounted`]);
  }
}

function MountCounter(name: string) {
  return createClassDecorator(new MountCounterBehavior(name));
}

@MountCounter("Card")
@Component()
class Card extends StatefulComponent {
  render() {
    return (
      <div style="padding:6px 10px;border:1px solid #ddd6fe;border-radius:6px;background:#f5f3ff;font-size:.85rem">
        Card
      </div>
    );
  }
}

@Component()
class MountCounterDemo extends StatefulComponent {
  @State() cards = 1;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">@MountCounter — class decorator</h3>
        <div style="display:flex;gap:8px">
          <button
            style="flex:1;padding:6px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.cards++; }}
          >
            Add card
          </button>
          <button
            style="flex:1;padding:6px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.cards = Math.max(0, this.cards - 1); }}
          >
            Remove card
          </button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          {() => Array.from({ length: this.cards }, () => <Card />)}
        </div>
        <p style="margin:0;font-size:.88rem">Mounted cards: <strong>{() => mounted()}</strong></p>
        <ul style="margin:0;padding-left:18px;font-size:.78rem;color:#6b7280">
          {() => log().map((line) => <li>{line}</li>)}
        </ul>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Built with <code>createClassDecorator</code>: <code>onMount</code> and
          <code>onUnmount</code> live on the behavior and receive the instance, so a card
          allocates nothing for them.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Decorators/ClassDecorator",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ClassDecorator: Story = {
  name: "createClassDecorator — @MountCounter",
  render: () => <MountCounterDemo />,
};
