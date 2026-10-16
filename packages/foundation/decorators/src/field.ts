import type { StatefulComponent } from "@praxisjs/core";

/**
 * The signature of a field decorator: usable on fields of classes extending `Base` whose type is
 * assignable to `Value`, so TypeScript rejects `@Clamp() name = ''` for a number-only decorator.
 */
export type FieldDecorator<Base = StatefulComponent, Value = unknown> = <This extends Base, V extends Value = Value>(
  value: undefined,
  context: ClassFieldDecoratorContext<This, V>,
) => void;

export type FieldHost = Record<PropertyKey, unknown>;

const KIND_NAMES: Record<DecoratorContext["kind"], string> = {
  class: "classes",
  method: "methods",
  getter: "getters",
  setter: "setters",
  field: "class fields",
  accessor: "accessors",
};

export function describeValue(value: unknown): string {
  if (typeof value === "function") return "a function";
  if (typeof value === "object" && value !== null) return "an object";
  return String(value as string | number | bigint | boolean | symbol | null | undefined);
}

/**
 * Throws when a decorator built for one kind of member is applied to another, naming the member,
 * e.g. `@Confirm() decorates methods only, not the field "title".`
 */
export function assertMemberKind(
  context: { readonly kind: DecoratorContext["kind"]; readonly name: string | symbol | undefined },
  kind: DecoratorContext["kind"],
  decorator: string,
): void {
  // A context without a kind was built by hand (decorators called directly in tests), not by a
  // decorator application, which always has one.
  if (context.kind === kind || (context.kind as string | undefined) === undefined) return;
  throw new TypeError(
    `${decorator} decorates ${KIND_NAMES[kind]} only, not the ${context.kind} "${String(context.name)}".`,
  );
}

/**
 * Throws when a field decorator is applied to anything but a plain class field. Above all an
 * `accessor`: the decorator would install its property on the instance, shadowing the accessor,
 * and decorators stacked on the same member would wrap the wrong thing.
 */
export function assertFieldContext(context: DecoratorContext, decorator = "This field decorator"): void {
  if (context.kind === "field") return;
  const member = String(context.name);
  throw new TypeError(
    context.kind === "accessor"
      ? `${decorator} decorates plain class fields only: remove \`accessor\` from "${member}".`
      : `${decorator} decorates class fields only, not the ${context.kind} "${member}".`,
  );
}

/**
 * Lets the decorator lowering of `@praxisjs/vite-plugin` define a decorated field through its
 * innermost decorator: an initializer added with `addClaimableInitializer` carries a `claim`
 * function under this key, which installs the decorator's property directly with the field's
 * initial value. The field is then never defined as a data property first, which in V8 would turn
 * every instance into a slow dictionary-mode object when the accessor replaces it. Without the
 * plugin (or under another decorator in the innermost position), the field is defined as usual and
 * the initializer runs as an ordinary one.
 */
export const CLAIM = Symbol.for("praxisjs.field.claim");

/**
 * Registers `claim` as the field's initializer: run as an ordinary extra initializer, it reads the
 * value from the data property the field was defined with; the lowering can call it with the
 * value instead (see CLAIM).
 */
export function addClaimableInitializer<This, Value>(
  context: ClassFieldDecoratorContext<This, Value>,
  claim: (this: This, value: Value) => void,
): void {
  const name = context.name;
  const init = function (this: This) {
    claim.call(this, (this as FieldHost)[name] as Value);
  } as ((this: This) => void) & { [CLAIM]?: typeof claim };
  init[CLAIM] = claim;
  context.addInitializer(init);
}

export interface SharedField {
  /** Installed on every instance in place of the field. */
  descriptor: PropertyDescriptor;
  /** Runs per instance before the descriptor is installed, with the field's initial value. */
  init?: (instance: FieldHost, initialValue: unknown) => void;
}

/**
 * Builds a field decorator whose accessors are created once per decorated field (by `setup`, at
 * class definition) and shared by every instance, which keeps its own state in symbol slots: all
 * instances share one hidden class and building one allocates no closures.
 */
export function sharedField<Base = StatefulComponent>(
  setup: (name: string) => SharedField,
): FieldDecorator<Base> {
  return function (_value, context) {
    assertFieldContext(context);
    const name = context.name as string;
    const { descriptor, init } = setup(name);
    descriptor.enumerable ??= true;
    descriptor.configurable ??= true;
    addClaimableInitializer(context, function (value) {
      const instance = this as unknown as FieldHost;
      init?.(instance, value);
      Object.defineProperty(instance, name, descriptor);
    });
  };
}
