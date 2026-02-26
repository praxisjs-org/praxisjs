import type { BaseComponent } from "@verbose/core";

export function Prop() {
  return function (target: object, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get(this: BaseComponent) {
        const fromParent = this._rawProps[propertyKey];
        if (fromParent !== undefined) return fromParent;
        return this._defaults[propertyKey];
      },
      set(this: BaseComponent, value: unknown) {
        this._defaults[propertyKey] = value;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
