import { State } from "@praxisjs/decorators";
import { Store } from "@praxisjs/store";

@Store()
export class CounterStore {
  @State() count = 0;

  increment() {
    this.count++;
  }

  decrement() {
    this.count--;
  }

  reset() {
    this.count = 0;
  }
}
