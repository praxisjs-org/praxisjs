import type { StatefulComponent } from "@praxisjs/core";

export function readProp(
  instance: StatefulComponent,
  propName: string,
): unknown {
  const fromParent = instance._rawProps[propName];
  if (fromParent !== undefined) return fromParent;
  return instance._defaults[propName];
}
