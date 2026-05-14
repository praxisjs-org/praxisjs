import { syncedSignal, type SyncedSignal } from "@praxisjs/core/internal";

import { createFieldDecorator } from "../create-field-decorator";

const signalMap = new WeakMap<object, Map<string, SyncedSignal<unknown>>>();

export function Synced(channelName?: string) {
  return createFieldDecorator({
    bind(instance, name, initialValue) {
      const key = channelName ?? name;

      if (!signalMap.has(instance)) signalMap.set(instance, new Map());
      const map = signalMap.get(instance) as Map<string, SyncedSignal<unknown>>;
      if (!map.has(key)) map.set(key, syncedSignal(key, initialValue));
      const sig = map.get(key) as SyncedSignal<unknown>;

      return {
        descriptor: {
          get: () => sig(),
          set: (value: unknown) => { sig.set(value); },
        },
        onUnmount() {
          sig.close();
        },
      };
    },
  });
}
