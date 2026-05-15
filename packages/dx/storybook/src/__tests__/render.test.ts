// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@praxisjs/runtime", () => ({
  render: vi.fn(() => vi.fn()), // returns a no-op cleanup
}));

import { render as praxisRender } from "@praxisjs/runtime";
import { renderToCanvas } from "../render";

const mockRender = vi.mocked(praxisRender);

function makeContext(overrides: Partial<{
  storyFn: () => unknown;
  showMain: () => void;
  forceRemount: boolean;
}> = {}) {
  return {
    storyFn: vi.fn(() => document.createTextNode("story")),
    showMain: vi.fn(),
    forceRemount: false,
    ...overrides,
  } as Parameters<typeof renderToCanvas>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRender.mockReturnValue(vi.fn());
});

describe("renderToCanvas()", () => {
  it("calls showMain()", async () => {
    const ctx = makeContext();
    const el = document.createElement("div");
    await renderToCanvas(ctx, el);
    expect(ctx.showMain).toHaveBeenCalledOnce();
  });

  it("calls praxisRender with a thunk and the canvas element", async () => {
    const ctx = makeContext();
    const el = document.createElement("div");
    await renderToCanvas(ctx, el);
    expect(mockRender).toHaveBeenCalledOnce();
    expect(mockRender).toHaveBeenCalledWith(expect.any(Function), el);
  });

  it("the thunk passed to praxisRender invokes storyFn", async () => {
    const ctx = makeContext();
    const el = document.createElement("div");
    await renderToCanvas(ctx, el);
    const thunk = mockRender.mock.calls[0][0] as () => unknown;
    thunk();
    expect(ctx.storyFn).toHaveBeenCalledOnce();
  });

  it("returns a resolved Promise", async () => {
    const ctx = makeContext();
    const el = document.createElement("div");
    const result = renderToCanvas(ctx, el);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it("forceRemount=false does not call the previous cleanup", async () => {
    const cleanup = vi.fn();
    mockRender.mockReturnValue(cleanup);

    const el = document.createElement("div");
    await renderToCanvas(makeContext({ forceRemount: false }), el);
    await renderToCanvas(makeContext({ forceRemount: false }), el);

    expect(cleanup).not.toHaveBeenCalled();
  });

  it("forceRemount=true calls and clears the previous cleanup", async () => {
    const cleanup = vi.fn();
    mockRender.mockReturnValue(cleanup);

    const el = document.createElement("div");
    // First render — establishes a cleanup
    await renderToCanvas(makeContext({ forceRemount: false }), el);

    // Second render with forceRemount — should call the previous cleanup
    await renderToCanvas(makeContext({ forceRemount: true }), el);

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("forceRemount=true with no prior cleanup does not throw", async () => {
    const el = document.createElement("div");
    await expect(
      renderToCanvas(makeContext({ forceRemount: true }), el),
    ).resolves.toBeUndefined();
  });
});
