// Runs in the default node environment: no window, as during a server render.
import { describe, expect, it } from "vitest";

import { ColorScheme, MediaQuery } from "../browser";
import { WindowSize } from "../dom";

describe("composables without a window", () => {
  it("WindowSize can be constructed and set up, reporting 0×0", () => {
    const ws = new WindowSize();
    const { width, height } = ws.setup();
    expect([width(), height()]).toEqual([0, 0]);
  });

  it("MediaQuery and ColorScheme set up without matchMedia and mount as no-ops", () => {
    const mq = new MediaQuery("(min-width: 768px)");
    expect(mq.setup().matches()).toBe(false);
    expect(() => { mq.onMount(); mq.onUnmount(); }).not.toThrow();

    const cs = new ColorScheme();
    const { isDark, isLight } = cs.setup();
    expect([isDark(), isLight()]).toEqual([false, true]);
    expect(() => { cs.onMount(); cs.onUnmount(); }).not.toThrow();
  });
});
