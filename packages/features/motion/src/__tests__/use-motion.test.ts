// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useMotion } from "../use-motion";

function makeRef(el: HTMLElement | null = null) {
  return { current: el };
}

describe("useMotion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("returns animate, enter, and exit functions", () => {
    const ref = makeRef(document.createElement("div"));
    const m = useMotion(ref);
    expect(typeof m.animate).toBe("function");
    expect(typeof m.enter).toBe("function");
    expect(typeof m.exit).toBe("function");
  });

  it("returns a cancel function when ref.current is null", () => {
    const ref = makeRef(null);
    const m = useMotion(ref);
    const cancel = m.animate({ opacity: [0, 1] });
    expect(typeof cancel).toBe("function");
    // calling cancel on null ref should not throw
    expect(() => { cancel(); }).not.toThrow();
  });

  it("sets opacity style during animation", async () => {
    const el = document.createElement("div");
    const ref = makeRef(el);
    const m = useMotion(ref);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return 1;
    });

    m.animate({ opacity: [0, 1], duration: 100 });

    // Simulate first frame at t=50 (half way through)
    rafCallbacks[0]?.(50);
    expect(el.style.opacity).not.toBe("");
  });

  it("sets transform style for x, y, scale, rotate", () => {
    const el = document.createElement("div");
    const ref = makeRef(el);
    const m = useMotion(ref);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return 1;
    });

    m.animate({ x: [0, 100], y: [0, 50], scale: [1, 2], rotate: [0, 90], duration: 200 });

    rafCallbacks[0]?.(100);
    expect(el.style.transform).toContain("translateX");
    expect(el.style.transform).toContain("translateY");
    expect(el.style.transform).toContain("scale");
    expect(el.style.transform).toContain("rotate");
  });

  it("calls onComplete when animation finishes", () => {
    const el = document.createElement("div");
    const ref = makeRef(el);
    const m = useMotion(ref);
    const onComplete = vi.fn();

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    m.animate({ opacity: [0, 1], duration: 100, onComplete });

    // First frame sets startTime = 0
    rafCallbacks[0](0);
    // Second frame at ts=100: elapsed=100, t=1, onComplete fires
    rafCallbacks[1](100);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("cancel() stops the animation", () => {
    const el = document.createElement("div");
    const ref = makeRef(el);
    const m = useMotion(ref);

    const cancelRaf = vi.fn();
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return 42;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(cancelRaf);

    const cancel = m.animate({ opacity: [0, 1], duration: 300 });
    cancel();

    // After cancel, further frames should be no-ops
    rafCallbacks[0]?.(100);
    expect(cancelRaf).toHaveBeenCalledWith(42);
  });

  it("exit() reverses opacity and x/y values", () => {
    const el = document.createElement("div");
    const ref = makeRef(el);
    const m = useMotion(ref);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return 1;
    });

    // exit reverses opacity [0,1] → animates [1,0] and x [0,100] → [100,0]
    m.exit({ opacity: [0, 1], x: [0, 100], duration: 100 });

    rafCallbacks[0]?.(0);
    // At t=0 (start), opacity should be 1 (the reversed start)
    expect(el.style.opacity).toBe("1");
  });

  it("enter() is an alias for animate()", () => {
    const el = document.createElement("div");
    const ref = makeRef(el);
    const m = useMotion(ref);
    const onComplete = vi.fn();

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });

    m.enter({ opacity: [0, 1], duration: 50, onComplete });

    rafCallbacks[0](0);   // sets startTime=0
    rafCallbacks[1](50);  // elapsed=50, t=1
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("respects delay option — no progress before delay elapses", () => {
    const el = document.createElement("div");
    const ref = makeRef(el);
    const m = useMotion(ref);

    const rafCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return 1;
    });

    m.animate({ opacity: [0, 1], delay: 200, duration: 100 });

    // At ts=50, delay not yet passed; opacity should be at start value (0)
    rafCallbacks[0]?.(50);
    expect(el.style.opacity).toBe("0");
  });
});
