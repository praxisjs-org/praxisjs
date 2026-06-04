import type { StorePlugin } from "./plugin-types.js";

const globalRegistry: StorePlugin[] = [];

export function useStorePlugin(plugin: StorePlugin): void {
  globalRegistry.push(plugin);
}

export function getGlobalPlugins(): StorePlugin[] {
  return globalRegistry.slice();
}

export function clearPlugins(): void {
  globalRegistry.length = 0;
}
