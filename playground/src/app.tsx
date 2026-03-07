import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component, Computed, State, Watch } from "@praxisjs/decorators";
import { Debug, Trace } from "@praxisjs/devtools";
import { Signal } from "@praxisjs/shared";

@Component()
export class ListItem extends StatelessComponent<{
  value: number;
}> {
  render() {
    return (
      <div>
        <span>{this.props.value}</span>
      </div>
    );
  }
}

@Component()
export class Version extends StatelessComponent {
  render() {
    return (
      <div>
        <span>vTeste</span>
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

  @Debug({ label: "doubled" })
  @Computed()
  get doubled() {
    return this.count * 2;
  }

  increment() {
    this.count++;
  }

  render() {
    return (
      <div class="app">
        <span class="count-value">{() => this.count}</span>
        <span>double: {() => this.doubled}</span>
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
