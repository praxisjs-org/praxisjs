import { componentPropsType, initComponentInternals } from "./internals";

export abstract class RootComponent<T extends object = Record<string, never>> {
  declare readonly [componentPropsType]: T;

  constructor(props: T = {} as T) {
    initComponentInternals(this, props);
  }

  onBeforeMount?(): void;
  onMount?(): void;
  onUnmount?(): void;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  onError?(error: Error): Node | Node[] | null | undefined | void;

  abstract render(): Node | Node[] | null;
}
