import { describe, it, expect, vi } from "vitest";

const { mountComponent, scope } = vi.hoisted(() => ({
  mountComponent: vi.fn(() => ["node"]),
  scope: { id: "scope" },
}));

vi.mock("@praxisjs/runtime", () => ({
  mountComponent,
  getCurrentScope: () => scope,
  render: vi.fn(),
}));

import { render, renderToCanvas } from "../preview";
import { renderToCanvas as fromRender } from "../render";

describe("preview annotations", () => {
  it("re-exports renderToCanvas", () => {
    expect(renderToCanvas).toBe(fromRender);
  });

  it("mounts the meta component with the story args as props", () => {
    class Greeting {}
    const args = { name: "Ada" };

    expect(render(args, { component: Greeting, title: "Greeting" })).toEqual(["node"]);
    expect(mountComponent).toHaveBeenCalledWith(Greeting, args, scope);
  });

  it("explains what is missing when the meta has no component", () => {
    expect(() => render({}, { title: "Docs/Intro" })).toThrow(/"Docs\/Intro" has no `component`/);
  });
});
