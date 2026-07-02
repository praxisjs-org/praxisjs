import { RootComponent } from "./base";

export abstract class StatefulComponent extends RootComponent<
  Record<string, unknown>
> {}
