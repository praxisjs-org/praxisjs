// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { createTransition } from "../transition";

describe("createTransition", () => {
  it("enter() adds and removes CSS classes", async () => {
    vi.useFakeTimers();
    const t = createTransition({ name: "fade", duration: 100 });
    const el = document.createElement("div");

    const p = t.enter(el);

    // enter-from should have been added immediately
    expect(el.classList.contains("fade-enter-from")).toBe(true);

    // requestAnimationFrame fires
    await vi.runAllTimersAsync();

    await p;
    expect(el.classList.contains("fade-enter-from")).toBe(false);
    expect(el.classList.contains("fade-enter-to")).toBe(false);
    vi.useRealTimers();
  });

  it("leave() adds and removes CSS classes", async () => {
    vi.useFakeTimers();
    const t = createTransition({ name: "slide", duration: 100 });
    const el = document.createElement("div");

    const p = t.leave(el);
    expect(el.classList.contains("slide-leave-from")).toBe(true);

    await vi.runAllTimersAsync();
    await p;

    expect(el.classList.contains("slide-leave-from")).toBe(false);
    expect(el.classList.contains("slide-leave-to")).toBe(false);
    vi.useRealTimers();
  });

  it("calls onEnter callback", async () => {
    vi.useFakeTimers();
    const onEnter = vi.fn();
    const t = createTransition({ onEnter, duration: 0 });
    const el = document.createElement("div");
    const p = t.enter(el);
    expect(onEnter).toHaveBeenCalledWith(el);
    await vi.runAllTimersAsync();
    await p;
    vi.useRealTimers();
  });

  it("calls onLeave callback", async () => {
    vi.useFakeTimers();
    const onLeave = vi.fn();
    const t = createTransition({ onLeave, duration: 0 });
    const el = document.createElement("div");
    const p = t.leave(el);
    expect(onLeave).toHaveBeenCalledWith(el);
    await vi.runAllTimersAsync();
    await p;
    vi.useRealTimers();
  });

  it("uses 'transition' as default name", async () => {
    vi.useFakeTimers();
    const t = createTransition();
    const el = document.createElement("div");
    t.enter(el);
    expect(el.classList.contains("transition-enter-from")).toBe(true);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });
});
