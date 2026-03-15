import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component, Computed, Prop, State, Watch } from "@praxisjs/decorators";
import { Debug, Trace } from "@praxisjs/devtools";
import { Signal } from "@praxisjs/shared";

@Component()
export class ListItem extends StatelessComponent<{
  value: number;
}> {
  render() {
    return (
      <div>
        <span>label</span>
        <span>{this.props.value}</span>
      </div>
    );
  }
}

@Component()
export class Version extends StatefulComponent {
  @Prop() value = 0;

  render() {
    return (
      <div>
        <span>VNEW</span>
        <span>{() => this.value}</span>
      </div>
    );
  }
}

function TesteV() {
  return <span>asdasdasdas</span>;
}

@Trace()
@Component()
export class App extends StatefulComponent {
  @Debug()
  @State()
  count = 0;

  @State() arr = [];

  @Debug({ label: "doubled" })
  @Computed()
  get doubled() {
    return this.count * 2;
  }

  increment() {
    this.count++;
    this.arr.push();
  }

  render() {
    return (
      <div class="app">
        <span
          class="count-value"
          style={() => ({
            backgroundColor: this.count % 2 === 0 ? "red" : "blue",
          })}
        >
          {() => this.count}
        </span>
        <span>double: {() => this.doubled}</span>
        <div>
          <ListItem value={() => this.count} />
        </div>
        <div>
          <Version value={() => this.count} />
        </div>
        <button
          onClick={() => {
            this.increment();
          }}
        >
          Increment
        </button>
        <TesteV />
        <Version />
      </div>
    );
  }
}
