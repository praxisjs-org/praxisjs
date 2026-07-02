import {
  getComponentDefault,
  getComponentRawProp,
  type RootComponent,
} from "@praxisjs/core/internal";

export function readProp(
  instance: RootComponent<Record<string, unknown>>,
  propName: string,
): unknown {
  const fromParent = getComponentRawProp(instance, propName);
  if (fromParent !== undefined) return fromParent;
  return getComponentDefault(instance, propName);
}
