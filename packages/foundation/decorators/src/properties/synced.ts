import { syncedSignal, type SyncedSignal } from "@praxisjs/core/internal";

import { type FieldDecorator, type FieldHost, sharedField } from "../field";
import { addLifecycleHooks } from "../lifecycle";

// Fields of one instance synced over the same channel share one signal. Only read while the
// instance is built; each field then reads its signal from its own slot.
const SIGNALS: unique symbol = Symbol("praxis.syncedSignals");

interface SyncedHost {
  [SIGNALS]?: Map<string, SyncedSignal<unknown>>;
}

export function Synced(channelName?: string): FieldDecorator {
  return sharedField((name) => {
    const slot = Symbol(`praxis.synced.${name}`);
    const key = channelName ?? name;
    const close = (instance: object) => { ((instance as FieldHost)[slot] as SyncedSignal<unknown>).close(); };
    return {
      descriptor: {
        get(this: FieldHost) {
          return (this[slot] as SyncedSignal<unknown>)();
        },
        set(this: FieldHost, value: unknown) {
          (this[slot] as SyncedSignal<unknown>).set(value);
        },
      },
      init(instance, initialValue) {
        const map = ((instance as SyncedHost)[SIGNALS] ??= new Map<string, SyncedSignal<unknown>>());
        let sig = map.get(key);
        if (!sig) {
          sig = syncedSignal(key, initialValue);
          map.set(key, sig);
        }
        instance[slot] = sig;
        addLifecycleHooks(instance, undefined, close);
      },
    };
  });
}
