import { State } from "@praxisjs/decorators";
import { Storable, ReactiveStore } from "@praxisjs/store";

@Storable()
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
