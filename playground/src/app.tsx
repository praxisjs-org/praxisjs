import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component, State, Watch } from "@praxisjs/decorators";
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

@Component()
export class App extends StatefulComponent {
  @State() count: Array<number> = [10, 12];
  // @State() value = 10;

  // @Watch("value")
  // checkValue(value: any) {
  //   console.log(value);
  // }

  increment() {
    const numero = Math.random();
    this.count = [...this.count, numero];
    // this.value++;
  }

  render() {
    return (
      <div class="app">
        <span class="count-value">
          {() => this.count.map((e) => <ListItem value={e} />)}
        </span>
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
