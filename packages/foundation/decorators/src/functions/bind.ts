import { createMethodDecorator } from "../create-method-decorator";

export function Bind() {
  return createMethodDecorator({
    wrap: (original, instance) => original.bind(instance),
  });
}
