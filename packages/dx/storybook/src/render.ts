import { render as praxisRender } from "@praxisjs/runtime";

import type { RenderContext } from "storybook/internal/types";

// One cleanup per canvas: on a docs page every story renders into its own canvas at the same time.
const mounted = new WeakMap<HTMLElement, () => void>();

function unmount(canvasElement: HTMLElement): void {
  const cleanup = mounted.get(canvasElement);
  if (cleanup === undefined) return;
  mounted.delete(canvasElement);
  cleanup();
}

/**
 * Mounts the story into its canvas. PraxisJS has no re-render pass, so every call (new args,
 * `forceRemount`, HMR) disposes whatever the canvas holds before mounting the story again. Storybook
 * calls the returned teardown when the story leaves the canvas; a teardown from an older render
 * leaves a newer one in place.
 */
export function renderToCanvas(
  { storyFn, showMain }: RenderContext,
  canvasElement: HTMLElement,
): Promise<() => void> {
  unmount(canvasElement);
  showMain();
  const cleanup = praxisRender(() => storyFn() as unknown as Node, canvasElement);
  mounted.set(canvasElement, cleanup);
  return Promise.resolve(() => {
    if (mounted.get(canvasElement) === cleanup) unmount(canvasElement);
  });
}
