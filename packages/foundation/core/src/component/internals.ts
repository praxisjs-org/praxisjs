export const componentPropsType: unique symbol = Symbol("praxis.componentPropsType");

interface ComponentInternals<T extends object> {
  rawProps: T;
  mounted: boolean;
  anchor: Node | undefined;
  start: Comment | undefined;
  defaults: Record<string, unknown>;
  stateDirty: boolean;
}

// Kept on the instance under a symbol rather than in a WeakMap: every @Prop read goes through
// here, and a property load is much cheaper than a WeakMap lookup.
const INTERNALS: unique symbol = Symbol("praxis.internals");

interface InternalsHost {
  [INTERNALS]?: ComponentInternals<object>;
}

function getInternals(instance: object): ComponentInternals<object> {
  const internals = (instance as InternalsHost)[INTERNALS];
  if (!internals) {
    throw new TypeError("Expected a PraxisJS component instance.");
  }
  return internals;
}

export function initComponentInternals(
  instance: object,
  props: object,
): void {
  (instance as InternalsHost)[INTERNALS] = {
    rawProps: { ...props },
    mounted: false,
    anchor: undefined,
    start: undefined,
    defaults: {},
    stateDirty: false,
  };
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

/**
 * A node of the mounted component's output: its only root node, or the comment that closes its
 * region when it renders several nodes. Its `parentElement` is the element the component sits in.
 */
export function getComponentAnchor(instance: object): Node | undefined {
  return getInternals(instance).anchor;
}

export function setComponentAnchor(
  instance: object,
  anchor: Node | undefined,
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
  const internals = (instance as InternalsHost)[INTERNALS];
  if (internals) {
    internals.stateDirty = true;
  }
}

export function isStateDirty(instance: object): boolean {
  const internals = (instance as InternalsHost)[INTERNALS];
  if (internals) return internals.stateDirty;
  return false;
}

export function setStateDirty(
  instance: object,
  stateDirty: boolean,
): void {
  const internals = (instance as InternalsHost)[INTERNALS];
  if (internals) {
    internals.stateDirty = stateDirty;
  }
}

/**
 * The comment that opens a component's region, when it has one: a component whose render sets it
 * (with the closing comment as its anchor) brings its own boundaries, and mountComponent adds none.
 */
export function getComponentStart(instance: object): Comment | undefined {
  return getInternals(instance).start;
}

export function setComponentStart(instance: object, start: Comment | undefined): void {
  getInternals(instance).start = start;
}
