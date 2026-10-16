import { type AnyMethod, type MethodContext, sharedMethod } from "../shared-method";

export function Bind() {
  return function (value: AnyMethod, context: MethodContext): AnyMethod {
    return sharedMethod(context, value);
  };
}
