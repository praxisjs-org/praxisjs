// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@praxisjs/runtime", () => ({
  render: vi.fn(() => vi.fn()),
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
  } as unknown as Parameters<typeof renderToCanvas>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRender.mockImplementation(() => vi.fn());
});

describe("renderToCanvas()", () => {
  it("calls showMain()", async () => {
    const ctx = makeContext();
    await renderToCanvas(ctx, document.createElement("div"));
    expect(ctx.showMain).toHaveBeenCalledOnce();
  });

  it("calls praxisRender with a thunk and the canvas element", async () => {
    const el = document.createElement("div");
    await renderToCanvas(makeContext(), el);
    expect(mockRender).toHaveBeenCalledOnce();
    expect(mockRender).toHaveBeenCalledWith(expect.any(Function), el);
  });

  it("the thunk passed to praxisRender invokes storyFn", async () => {
    const ctx = makeContext();
    await renderToCanvas(ctx, document.createElement("div"));
    const thunk = mockRender.mock.calls[0][0] as () => unknown;
    thunk();
    expect(ctx.storyFn).toHaveBeenCalledOnce();
  });

  it("disposes the previous story on a re-render without forceRemount (args change)", async () => {
    const first = vi.fn();
    mockRender.mockReturnValueOnce(first);
    const el = document.createElement("div");

    await renderToCanvas(makeContext({ forceRemount: false }), el);
    await renderToCanvas(makeContext({ forceRemount: false }), el);

    expect(first).toHaveBeenCalledOnce();
  });

  it("disposes the previous story on forceRemount", async () => {
    const first = vi.fn();
    mockRender.mockReturnValueOnce(first);
    const el = document.createElement("div");

    await renderToCanvas(makeContext(), el);
    await renderToCanvas(makeContext({ forceRemount: true }), el);

    expect(first).toHaveBeenCalledOnce();
  });

  it("keeps stories in different canvases apart", async () => {
    const a = vi.fn();
    const b = vi.fn();
    mockRender.mockReturnValueOnce(a).mockReturnValueOnce(b);

    await renderToCanvas(makeContext(), document.createElement("div"));
    await renderToCanvas(makeContext({ forceRemount: true }), document.createElement("div"));

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("returns a teardown that disposes the story once", async () => {
    const cleanup = vi.fn();
    mockRender.mockReturnValueOnce(cleanup);
    const el = document.createElement("div");

    const teardown = await renderToCanvas(makeContext(), el);
    teardown();
    teardown();
    await renderToCanvas(makeContext(), el);

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("a teardown from an older render leaves the newer one mounted", async () => {
    const first = vi.fn();
    const second = vi.fn();
    mockRender.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const el = document.createElement("div");

    const oldTeardown = await renderToCanvas(makeContext(), el);
    const newTeardown = await renderToCanvas(makeContext(), el);
    oldTeardown();

    expect(second).not.toHaveBeenCalled();
    newTeardown();
    expect(second).toHaveBeenCalledOnce();
  });

  it("forceRemount=true with nothing mounted does not throw", async () => {
    await expect(
      renderToCanvas(makeContext({ forceRemount: true }), document.createElement("div")),
    ).resolves.toEqual(expect.any(Function));
  });
});
