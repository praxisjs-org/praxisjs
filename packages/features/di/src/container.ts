export type Scope = "singleton" | "transient";

export interface InjectableOptions {
  scope?: Scope;
}

export interface ServiceDescriptor {
  target: Constructor;
  scope: Scope;
  instance?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;

// TC39-compatible metadata storage
const constructorDepsMap = new WeakMap<
  Constructor,
  Array<Constructor | Token<unknown>>
>();
const propDepsMap = new WeakMap<
  object,
  Map<string, Constructor | Token<unknown>>
>();

export function setConstructorDeps(
  target: Constructor,
  deps: Array<Constructor | Token<unknown>>,
): void {
  constructorDepsMap.set(target, deps);
}

export function setPropDep(
  prototype: object,
  prop: string,
  dep: Constructor | Token<unknown>,
): void {
  if (!propDepsMap.has(prototype)) {
    propDepsMap.set(prototype, new Map());
  }
  propDepsMap.get(prototype)?.set(prop, dep);
}

export class Token<_T> {
  readonly description: string;
  constructor(description: string) {
    this.description = description;
  }
  toString() {
    return `Token(${this.description})`;
  }
}

export function token<T>(description: string): Token<T> {
  return new Token<T>(description);
}

export class Container {
  private readonly services = new Map<Constructor | Token<unknown>, unknown>();
  private readonly parent?: Container;

  constructor(parent?: Container) {
    this.parent = parent;
  }

  register<T>(target: Constructor<T>, options: InjectableOptions = {}): this {
    this.services.set(target, {
      target,
      scope: options.scope ?? "singleton",
    } satisfies ServiceDescriptor);
    return this;
  }

  registerValue<T>(token: Token<T>, value: T): this {
    this.services.set(token, value);
    return this;
  }

  registerFactory<T>(
    token: Token<T>,
    factory: (container: Container) => T,
  ): this {
    this.services.set(token, factory(this));
    return this;
  }

  resolve<T>(
    target: Constructor<T> | Token<T>,
    resolutionStack = new Set<Constructor | Token<unknown>>(),
  ): T {
    const key = target as Constructor | Token<unknown>;

    if (resolutionStack.has(key)) {
      const chain = [...resolutionStack, key]
        .map((k) => (k instanceof Token ? k.toString() : k.name))
        .join(" → ");
      throw new Error(`[DI] Circular dependency detected: ${chain}`);
    }

    resolutionStack.add(key);
    try {
      const entry = this.services.get(key);

      if (target instanceof Token) {
        if (entry !== undefined) return entry as T;
        if (this.parent) return this.parent.resolve(target);
        throw new Error(`[DI] Token not registered: ${target.toString()}`);
      }

      if (!entry) {
        if (this.parent) return this.parent.resolve(target);
        throw new Error(
          `[DI] Service not registered: ${(target as Constructor).name}`,
        );
      }

      const descriptor = entry as ServiceDescriptor;

      if (descriptor.scope === "singleton") {
        descriptor.instance ??= this.instantiate(
          descriptor.target,
          resolutionStack,
        );
        return descriptor.instance as T;
      }

      return this.instantiate(descriptor.target, resolutionStack) as T;
    } finally {
      resolutionStack.delete(key);
    }
  }

  private instantiate<T>(
    target: Constructor<T>,
    resolutionStack = new Set<Constructor | Token<unknown>>(),
  ): T {
    const deps = constructorDepsMap.get(target as Constructor) ?? [];

    const resolvedDeps = deps.map((dep) =>
      this.resolve(dep as Constructor, resolutionStack),
    );
    let instance: T;
    try {
      instance = new target(...resolvedDeps);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("[DI]")) throw err;
      throw new Error(
        `[DI] Failed to instantiate "${target.name}": ${(err as Error).message}`,
      );
    }

    const propInjections =
      propDepsMap.get(target.prototype as object) ??
      new Map<string, Constructor | Token<unknown>>();

    for (const [prop, dep] of propInjections) {
      (instance as Record<string, unknown>)[prop] = this.resolve(
        dep as Constructor,
        resolutionStack,
      );
    }

    return instance;
  }

  createChild(): Container {
    return new Container(this);
  }
}

export const container = new Container();
