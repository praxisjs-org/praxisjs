export interface StoreMutation {
  key: string;
  value: unknown;
  prevValue: unknown;
  storeName: string;
}

export interface StoreActionContext {
  name: string;
  args: unknown[];
  storeName: string;
}

export interface StoreActionResult extends StoreActionContext {
  result: unknown;
  error?: unknown;
}

export interface StoreInitContext {
  store: Record<string, unknown>;
  storeName: string;
  extend(props: Record<string, unknown>): void;
}

export interface StorePlugin {
  name: string;
  onInit?(context: StoreInitContext): void;
  onMutation?(mutation: StoreMutation): void;
  onAction?(context: StoreActionContext): void;
  onActionDone?(result: StoreActionResult): void;
}
