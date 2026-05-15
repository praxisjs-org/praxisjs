import { jsx } from "@praxisjs/jsx/jsx-runtime";
import type { Preview } from "storybook/internal/types";

export { renderToCanvas } from "@praxisjs/storybook";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /date$/i,
      },
    },
    layout: "centered",
  },

  // Default render: component from meta + args from controls
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render(args: Record<string, unknown>, context: any) {
    const Cmp = context.component as new (...a: unknown[]) => unknown;
    if (!Cmp) return null;
    return jsx(Cmp, args) as unknown as Node;
  },
};

export default preview;
