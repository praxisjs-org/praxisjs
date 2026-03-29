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
  private readonly services = new Map<
    Constructor | Token<unknown>,
    unknown
  >();
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
        .map((k) =>
          k instanceof Token ? k.toString() : (k).name,
        )
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
        descriptor.instance ??= this.instantiate(descriptor.target, resolutionStack);
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
    const deps: Array<Constructor | Token<unknown>> =
      (Reflect.getMetadata("di:inject", target) as Array<Constructor | Token<unknown>> | undefined) ?? [];

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

    const rawPropInjections: unknown = Reflect.getMetadata("di:props", target.prototype as object);
    const propInjections =
      (rawPropInjections as Map<string, Constructor | Token<unknown>> | undefined) ?? new Map<string, Constructor | Token<unknown>>();

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
