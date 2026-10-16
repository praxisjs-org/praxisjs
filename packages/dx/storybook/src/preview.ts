import { getCurrentScope, mountComponent } from "@praxisjs/runtime";

export { renderToCanvas } from "./render";

type MountableComponent = Parameters<typeof mountComponent>[0];

interface DefaultRenderContext {
  component?: unknown;
  title: string;
}

/** Default story render: mounts the meta's `component` with the story's args as props. */
export function render(args: Record<string, unknown>, context: DefaultRenderContext): Node[] {
  const { component, title } = context;
  if (component === undefined) {
    throw new Error(
      `[@praxisjs/storybook] "${title}" has no \`component\` in its default export and the story has no \`render\` function.`,
    );
  }
  return mountComponent(component as MountableComponent, args, getCurrentScope());
}
