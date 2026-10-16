import { markStateDirty, readSignal, SignalNode, writeSignal } from "@praxisjs/core/internal";

import { type FieldDecorator, type FieldHost, sharedField } from "../field";

import type { ReactiveHost } from "../reactive-host";

// One per decorated field per instance. It is also the handler of every proxy it hands out, so
// proxying a nested object allocates only the Proxy itself.
class DeepStateCell implements ProxyHandler<object> {
  readonly version = new SignalNode(0);
  // One proxy per raw object: repeated reads return the same reference (so `a.b === a.b` and
  // identity comparisons in effects hold) and don't allocate a new Proxy on every access.
  private proxies: WeakMap<object, object> | undefined = undefined;
  current: unknown;

  constructor(private readonly host: object, value: unknown) {
    this.current = this.wrap(value);
  }

  wrap(value: unknown): unknown {
    if (value === null || typeof value !== "object") return value;
    const proxies = (this.proxies ??= new WeakMap());
    let proxy = proxies.get(value);
    if (proxy === undefined) {
      proxy = new Proxy(value, this);
      proxies.set(value, proxy);
    }
    return proxy;
  }

  changed(): void {
    markStateDirty(this.host);
    writeSignal(this.version, this.version.value + 1);
  }

  get(obj: object, key: string | symbol, receiver: unknown): unknown {
    return this.wrap(Reflect.get(obj, key, receiver));
  }

  set(obj: object, key: string | symbol, value: unknown): boolean {
    const had = Object.hasOwn(obj, key);
    const prev: unknown = Reflect.get(obj, key);
    const result = Reflect.set(obj, key, value);
    if (!had || !Object.is(prev, value)) this.changed();
    return result;
  }

  deleteProperty(obj: object, key: string | symbol): boolean {
    const had = Object.hasOwn(obj, key);
    const result = Reflect.deleteProperty(obj, key);
    if (had) this.changed();
    return result;
  }
}

export function DeepState(): FieldDecorator<ReactiveHost> {
  return sharedField<ReactiveHost>((name) => {
    const slot = Symbol(`praxis.deepState.${name}`);
    return {
      descriptor: {
        get(this: FieldHost) {
          const cell = this[slot] as DeepStateCell;
          readSignal(cell.version);
          return cell.current;
        },
        set(this: FieldHost, value: unknown) {
          const cell = this[slot] as DeepStateCell;
          cell.current = cell.wrap(value);
          cell.changed();
        },
      },
      init(instance, initialValue) {
        instance[slot] = new DeepStateCell(instance, initialValue);
      },
    };
  });
}
