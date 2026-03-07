import type { StatefulComponent } from "@praxisjs/core";

export function Prop() {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext<StatefulComponent>,
  ): void {
    context.addInitializer(function (this: unknown) {
      const instance = this as StatefulComponent;
      const name = context.name as string;
      const raw = instance as unknown as Record<string, unknown>;
      const defaultValue = raw[name];
      Reflect.deleteProperty(raw, name);

      instance._defaults[name] = defaultValue;

      Object.defineProperty(instance, name, {
        get(this: StatefulComponent) {
          const fromParent = this._rawProps[name];
          if (fromParent !== undefined) {
            return typeof fromParent === "function"
              ? (fromParent as () => unknown)()
              : fromParent;
          }
          return this._defaults[name];
        },
        set(this: StatefulComponent, value: unknown) {
          this._defaults[name] = value;
        },
        enumerable: true,
        configurable: true,
      });
    });
  };
}
