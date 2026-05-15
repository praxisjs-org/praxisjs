import type { ComponentAnnotations, StoryAnnotations } from "@storybook/core/csf";
import type { WebRenderer } from "@storybook/core/types";

export interface PraxisRenderer extends WebRenderer {
  canvasElement: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: new (...args: any[]) => unknown;
  storyResult: Node | Node[] | null | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Meta<T = any> = ComponentAnnotations<PraxisRenderer, T>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoryObj<T = any> = StoryAnnotations<PraxisRenderer, T>;

export interface StorybookConfig {
  stories: string[];
  addons?: string[];
  framework: {
    name: string;
    options?: Record<string, unknown>;
  };
  docs?: Record<string, unknown>;
}
