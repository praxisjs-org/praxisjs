import { createFieldDecorator } from "../create-field-decorator";

export function Prop() {
  return createFieldDecorator({
    bind(instance, name, initialValue) {
      instance._defaults[name] = initialValue;
      return {
        descriptor: {
          get() {
            const fromParent = (instance._rawProps)[name];
            if (fromParent !== undefined) {
              return typeof fromParent === "function"
                ? (fromParent as () => unknown)()
                : fromParent;
            }
            return instance._defaults[name];
          },
          set(value: unknown) {
            instance._defaults[name] = value;
          },
        },
      };
    },
  });
}
