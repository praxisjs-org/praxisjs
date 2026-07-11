import { render as praxisRender } from "@praxisjs/runtime";

import type { RenderContext } from "storybook/internal/types";


let cleanup: (() => void) | undefined;

export function renderToCanvas(
  { storyFn, showMain, forceRemount }: RenderContext,
  canvasElement: HTMLElement,
): Promise<void> {
  if (forceRemount) {
    cleanup?.();
    cleanup = undefined;
  }

  showMain();

  cleanup = praxisRender(
    () => storyFn() as unknown as Node,
    canvasElement,
  );

  return Promise.resolve();
}
