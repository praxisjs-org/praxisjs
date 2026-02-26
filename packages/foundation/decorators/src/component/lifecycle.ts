import { type BaseComponent, VALID_LIFECYCLE_HOOK_SIGNATURES } from "@verbose/core";

function getAllMethods(proto: object): string[] {
  const methods: string[] = [];
  let current: object | null = proto;

  while (current !== null && current !== Object.prototype) {
    const names = Object.getOwnPropertyNames(current);
    for (const name of names) {
      if (
        name !== "constructor" &&
        typeof (current as Record<string, unknown>)[name] === "function"
      ) {
        if (!methods.includes(name)) methods.push(name);
      }
    }
    current = Object.getPrototypeOf(current) as object | null;
  }

  return methods;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LifeCycle<T extends new (...args: any[]) => BaseComponent>(
  constructor: T,
): T {
  if (process.env.NODE_ENV === "production") return constructor;

  const validHooks = new Set<string>(
    Object.keys(VALID_LIFECYCLE_HOOK_SIGNATURES),
  );
  const proto = constructor.prototype as Record<string, unknown>;

  const allMethods = getAllMethods(proto);
  for (const method of allMethods) {
    if (!method.startsWith("on")) continue;

    if (!validHooks.has(method)) {
      console.warn(
        `[LifeCycle] "${constructor.name}.${method}" appears to be a lifecycle hook but is not recognized.\n` +
          `Valid hooks: ${[...validHooks].join(", ")}`,
      );
    }
  }

  return constructor;
}
