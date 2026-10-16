import type { StatefulComponent } from "@praxisjs/core";

import { addClaimableInitializer, assertFieldContext, describeValue, type FieldDecorator, type FieldHost } from "./field";
import { addLifecycleHooks } from "./lifecycle";

export interface FieldBinding {
  /** Replaces the decorated property. If absent, the original property is left untouched. */
  descriptor?: PropertyDescriptor;
  /** Extra properties to define on the instance (e.g. companion properties like `nameHistory`). */
  additional?: Record<string, PropertyDescriptor>;
  onMount?: () => void;
  onUnmount?: () => void;
}

export interface FieldBehavior<T = object, Value = unknown> {
  /** Names the decorator in error messages, e.g. `"@SessionValue()"`. */
  label?: string;
  /** Runs once per instance, while it is built. */
  bind(instance: T, name: string, initialValue: Value): FieldBinding;
}

/**
 * What a shared field decorator installs. `get` and `set` become one accessor pair shared by every
 * instance (`this` is the instance), so per-instance state belongs in symbol slots on the instance,
 * created in `init`.
 */
export interface FieldSetup<This = object, Value = unknown> {
  get?(this: This): Value;
  set?(this: This, value: Value): void;
  /**
   * Runs once per instance, before `get`/`set` are installed, with the field's initial value. A
   * decorator stacked under this one has already installed its own property.
   */
  init?: (instance: This, initialValue: Value) => void;
  onMount?: (instance: This) => void;
  onUnmount?: (instance: This) => void;
  /** Defaults to `true`, like a plain field. */
  enumerable?: boolean;
}

export interface SharedFieldBehavior<Host = object, Value = unknown> {
  /** Names the decorator in error messages, e.g. `"@Clamp()"`. */
  label?: string;
  /** Runs once per decorated field, when the class is defined. */
  setup(name: string, context: ClassFieldDecoratorContext<Host, Value>): FieldSetup<Host, Value>;
}

const DEFAULT_LABEL = "This field decorator";

function defineValue(instance: object, name: string, value: unknown): void {
  Object.defineProperty(instance, name, { value, writable: true, enumerable: true, configurable: true });
}

function bindField<T, Value>(behavior: FieldBehavior<T, Value>): FieldDecorator<T, Value> {
  const label = behavior.label ?? DEFAULT_LABEL;
  return function (_value, context) {
    assertFieldContext(context, label);
    const name = context.name as string;
    addClaimableInitializer(context, function (initialValue) {
      const instance = this as unknown as T & object;
      const binding: unknown = behavior.bind(instance, name, initialValue as Value);
      if (typeof binding !== "object" || binding === null) {
        throw new TypeError(`${label}: bind() must return an object (a FieldBinding), got ${describeValue(binding)}.`);
      }
      const { descriptor, additional, onMount, onUnmount } = binding as FieldBinding;

      if (descriptor) {
        // The descriptor is fresh from bind(), so defaults are filled in place rather than copied.
        descriptor.enumerable ??= true;
        descriptor.configurable ??= true;
        Object.defineProperty(instance, name, descriptor);
      } else if (!Object.hasOwn(instance, name)) {
        // A binding without a descriptor keeps the plain field, which a claimed field has not got yet.
        defineValue(instance, name, initialValue);
      }

      if (additional) {
        for (const key in additional) {
          const desc = additional[key];
          desc.configurable ??= true;
          Object.defineProperty(instance, key, desc);
        }
      }

      if (onMount ?? onUnmount) addLifecycleHooks(instance, onMount, onUnmount);
    });
  } as FieldDecorator<T, Value>;
}

function sharedFieldDecorator<Host, Value>(behavior: SharedFieldBehavior<Host, Value>): FieldDecorator<Host, Value> {
  const label = behavior.label ?? DEFAULT_LABEL;
  return function (_value, context) {
    assertFieldContext(context, label);
    const name = context.name as string;
    const result: unknown = behavior.setup(name, context as ClassFieldDecoratorContext<Host, Value>);
    if (typeof result !== "object" || result === null) {
      throw new TypeError(`${label}: setup() must return an object (a FieldSetup), got ${describeValue(result)}.`);
    }
    const field = result as FieldSetup<Host, Value>;
    const { init, onMount, onUnmount } = field;
    const descriptor: PropertyDescriptor | undefined =
      field.get === undefined && field.set === undefined
        ? undefined
        // eslint-disable-next-line @typescript-eslint/unbound-method -- installed as accessors, which call them with the instance as `this`
        : { get: field.get, set: field.set, enumerable: field.enumerable ?? true, configurable: true };
    const hooks = onMount !== undefined || onUnmount !== undefined;
    addClaimableInitializer(context, function (value) {
      const instance = this as unknown as Host & FieldHost;
      init?.(instance, value as Value);
      if (descriptor !== undefined) Object.defineProperty(instance, name, descriptor);
      else if (!Object.hasOwn(instance, name)) defineValue(instance, name, value);
      if (hooks) {
        addLifecycleHooks(
          instance,
          onMount as ((instance: object) => void) | undefined,
          onUnmount as ((instance: object) => void) | undefined,
        );
      }
    });
  } as FieldDecorator<Host, Value>;
}

/**
 * Builds a field decorator.
 *
 * With `setup`, the recommended form, the decorator's accessors are created once per decorated
 * field and shared by every instance, which keeps its state in symbol slots: building an instance
 * allocates no closures and every instance keeps the same hidden class.
 *
 * With `bind`, a binding (descriptor, hooks, extra properties) is created for each instance, which
 * suits decorators that wrap whatever property a decorator stacked under them installed.
 */
export function createFieldDecorator<Host = object, Value = unknown>(
  behavior: SharedFieldBehavior<Host, Value>,
): FieldDecorator<Host, Value>;
export function createFieldDecorator<T = StatefulComponent, Value = unknown>(
  behavior: FieldBehavior<T, Value>,
): FieldDecorator<T, Value>;
export function createFieldDecorator(
  behavior: SharedFieldBehavior | FieldBehavior,
): FieldDecorator<object> {
  return "setup" in behavior ? sharedFieldDecorator(behavior) : bindField(behavior);
}
