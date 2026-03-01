import { createStore } from "@verbose/store";

export const useCounterStore = createStore({
  count: 0,
  increment() {
    this.count++;
  },
  decrement() {
    this.count--;
  },
  reset() {
    this.count = 0;
  },
});
