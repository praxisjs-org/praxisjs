export function Route(path: string) {
  return function (value: abstract new (...args: unknown[]) => unknown, _context: ClassDecoratorContext): void {
    Object.defineProperty(value, "__routePath", {
      value: path,
      writable: false,
      configurable: false,
    });
  };
}
