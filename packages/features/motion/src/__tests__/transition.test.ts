// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createTransition } from "../transition";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

function makeEl() {
  return document.createElement("div");
}

describe("createTransition()", () => {
  it("enter() adds enter-from class immediately", () => {
    const t = createTransition({ name: "fade" });
    const el = makeEl();
    void t.enter(el);
    expect(el.classList.contains("fade-enter-from")).toBe(true);
  });

  it("enter() removes enter-from and adds enter-to after rAF", () => {
    const t = createTransition({ name: "fade", duration: 1000 });
    const el = makeEl();
    void t.enter(el);
    // Advance past rAF (16ms) but not past duration (1000ms)
    vi.advanceTimersByTime(20);
    expect(el.classList.contains("fade-enter-from")).toBe(false);
    expect(el.classList.contains("fade-enter-to")).toBe(true);
  });

  it("enter() resolves and cleans up after duration", async () => {
    const t = createTransition({ name: "fade", duration: 300 });
    const el = makeEl();
    const p = t.enter(el);
    vi.advanceTimersByTime(300);
    await p;
    expect(el.classList.contains("fade-enter-to")).toBe(false);
  });

  it("leave() adds leave-from class immediately", () => {
    const t = createTransition({ name: "slide" });
    const el = makeEl();
    void t.leave(el);
    expect(el.classList.contains("slide-leave-from")).toBe(true);
  });

  it("leave() removes leave-from and adds leave-to after rAF", () => {
    const t = createTransition({ name: "slide", duration: 1000 });
    const el = makeEl();
    void t.leave(el);
    // Advance past rAF (16ms) but not past duration (1000ms)
    vi.advanceTimersByTime(20);
    expect(el.classList.contains("slide-leave-from")).toBe(false);
    expect(el.classList.contains("slide-leave-to")).toBe(true);
  });

  it("leave() resolves and cleans up after duration", async () => {
    const t = createTransition({ name: "slide", duration: 200 });
    const el = makeEl();
    const p = t.leave(el);
    vi.advanceTimersByTime(200);
    await p;
    expect(el.classList.contains("slide-leave-to")).toBe(false);
  });

  it("uses default name 'transition' when none provided", () => {
    const t = createTransition();
    const el = makeEl();
    void t.enter(el);
    expect(el.classList.contains("transition-enter-from")).toBe(true);
  });

  it("calls onEnter callback with element", () => {
    const onEnter = vi.fn();
    const t = createTransition({ onEnter });
    const el = makeEl();
    void t.enter(el);
    expect(onEnter).toHaveBeenCalledWith(el);
  });

  it("calls onLeave callback with element", () => {
    const onLeave = vi.fn();
    const t = createTransition({ onLeave });
    const el = makeEl();
    void t.leave(el);
    expect(onLeave).toHaveBeenCalledWith(el);
  });

  it("uses default duration of 300ms", async () => {
    const t = createTransition({ name: "x" });
    const el = makeEl();
    const p = t.enter(el);
    vi.advanceTimersByTime(300);
    await p;
    expect(el.classList.contains("x-enter-to")).toBe(false);
  });
});
