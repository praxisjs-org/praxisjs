import type { ComponentInstance } from "@verbose/shared";

type PropsRecord = Record<string, unknown>;

function shallowEqual(a: PropsRecord, b: PropsRecord) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  const bHasOwnProperty = Object.prototype.hasOwnProperty.bind(b);

  for (const aKey of keysA) {
    if (!bHasOwnProperty(aKey)) return false;
    if (!Object.is(a[aKey], b[aKey])) return false;
  }
  return true;
}

export function Momoize(
  areEqual: (prev: PropsRecord, next: PropsRecord) => boolean = shallowEqual,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (...args: any[]) => ComponentInstance>(
    constructor: T,
  ): T {
    (constructor as unknown as ComponentInstance)._isMemorized = true;
    (constructor as unknown as ComponentInstance)._arePropsEqual = areEqual;
    return constructor;
  };
}
