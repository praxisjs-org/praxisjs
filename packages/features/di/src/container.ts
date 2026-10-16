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

// Shared by every resolution: a constructor that calls `inject()` starts a new resolve() call, and a
// cycle running through it must still be caught instead of overflowing the stack.
const resolving = new Set<Constructor | Token<unknown>>();

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
    resolutionStack: Set<Constructor | Token<unknown>> = resolving,
  ): T {
    const key = target as Constructor | Token<unknown>;

    if (resolutionStack.size !== 0 && resolutionStack.has(key)) {
      const chain = [...resolutionStack, key]
        .map((k) => (k instanceof Token ? k.toString() : k.name))
        .join(" → ");
      throw new Error(`[DI] Circular dependency detected: ${chain}`);
    }

    const entry = this.services.get(key);

    if (target instanceof Token) {
      if (entry !== undefined) return entry as T;
      if (this.parent) return this.parent.resolve(target, resolutionStack);
      throw new Error(`[DI] Token not registered: ${target.toString()}`);
    }

    if (!entry) {
      if (this.parent) return this.parent.resolve(target, resolutionStack);
      throw new Error(
        `[DI] Service not registered: ${(target as Constructor).name}`,
      );
    }

    const descriptor = entry as ServiceDescriptor;
    const singleton = descriptor.scope === "singleton";
    if (singleton && descriptor.instance !== undefined) return descriptor.instance as T;

    // Only a key that is being constructed goes on the stack, so delegating to a parent is never
    // mistaken for a cycle.
    resolutionStack.add(key);
    try {
      const instance = this.instantiate(descriptor.target);
      if (singleton) descriptor.instance = instance;
      return instance as T;
    } finally {
      resolutionStack.delete(key);
    }
  }

  private instantiate<T>(target: Constructor<T>): T {
    try {
      return new target();
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("[DI]")) throw err;
      throw new Error(
        `[DI] Failed to instantiate "${target.name}": ${(err as Error).message}`,
      );
    }
  }

  createChild(): Container {
    return new Container(this);
  }
}

export const container = new Container();
