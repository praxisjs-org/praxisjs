import { State } from "@praxisjs/decorators";
import { Store, ReactiveStore } from "@praxisjs/store";

@Store()
export class CounterStore extends ReactiveStore {
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
