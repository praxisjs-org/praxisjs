export const componentPropsType: unique symbol = Symbol("praxis.componentPropsType");

interface ComponentInternals<T extends object> {
  rawProps: T;
  mounted: boolean;
  anchor?: Comment;
  defaults: Record<string, unknown>;
  stateDirty: boolean;
}

const componentInternals = new WeakMap<object, ComponentInternals<object>>();

function getInternals(instance: object): ComponentInternals<object> {
  const internals = componentInternals.get(instance);
  if (!internals) {
    throw new TypeError("Expected a PraxisJS component instance.");
  }
  return internals;
}

export function initComponentInternals(
  instance: object,
  props: object,
): void {
  componentInternals.set(instance, {
    rawProps: { ...props },
    mounted: false,
    defaults: {},
    stateDirty: false,
  });
}

export function getComponentProps(instance: object): object {
  return getInternals(instance).rawProps;
}

export function setComponentProps(
  instance: object,
  props: Record<string, unknown>,
): void {
  const rawProps = getInternals(instance).rawProps as Record<string, unknown>;
  Object.keys(rawProps).forEach((key) => {
    Reflect.deleteProperty(rawProps, key);
  });
  Object.assign(rawProps, props);
}

export function getComponentRawProp(
  instance: object,
  name: string,
): unknown {
  return (getInternals(instance).rawProps as Record<string, unknown>)[name];
}

export function getComponentDefault(
  instance: object,
  name: string,
): unknown {
  return getInternals(instance).defaults[name];
}

export function setComponentDefault(
  instance: object,
  name: string,
  value: unknown,
): void {
  getInternals(instance).defaults[name] = value;
}

export function getComponentDefaults(
  instance: object,
): Record<string, unknown> {
  return getInternals(instance).defaults;
}

export function getComponentAnchor(instance: object): Comment | undefined {
  return getInternals(instance).anchor;
}

export function setComponentAnchor(
  instance: object,
  anchor: Comment | undefined,
): void {
  getInternals(instance).anchor = anchor;
}

export function isComponentMounted(instance: object): boolean {
  return getInternals(instance).mounted;
}

export function setComponentMounted(
  instance: object,
  mounted: boolean,
): void {
  getInternals(instance).mounted = mounted;
}

export function markStateDirty(instance: object): void {
  const internals = componentInternals.get(instance);
  if (internals) {
    internals.stateDirty = true;
  }
}

export function isStateDirty(instance: object): boolean {
  const internals = componentInternals.get(instance);
  if (internals) return internals.stateDirty;
  return false;
}

export function setStateDirty(
  instance: object,
  stateDirty: boolean,
): void {
  const internals = componentInternals.get(instance);
  if (internals) {
    internals.stateDirty = stateDirty;
  }
}
