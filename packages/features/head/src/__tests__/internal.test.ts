// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

import { pushHead, removeHead } from "../head-stack";
import { resetHeadState } from "../internal";

describe("@praxisjs/head/internal", () => {
  it("exports resetHeadState, which removes managed head elements", () => {
    document.head.innerHTML = "";
    pushHead(Symbol("page"), { title: "pushed", description: "desc" });
    expect(document.head.querySelectorAll("[data-praxis-head]").length).toBeGreaterThan(0);

    resetHeadState();

    expect(document.head.querySelectorAll("[data-praxis-head]")).toHaveLength(0);
  });

  it("forgets the remembered initial title, so the next page's baseline is captured fresh", () => {
    // Without resetHeadState between "pages", the initial title is only ever
    // captured once (pushHead's `_initialTitle ??=`) — exactly the leak an
    // @praxisjs/ssg prerender run (many render() calls, one Node process)
    // needs this export to avoid between routes.
    document.head.innerHTML = "";
    document.title = "page A";
    const idA = Symbol("a");
    pushHead(idA, { title: "A" });
    removeHead(idA);
    expect(document.title).toBe("page A");

    resetHeadState();

    document.title = "page B";
    const idB = Symbol("b");
    pushHead(idB, { title: "B" });
    removeHead(idB);
    expect(document.title).toBe("page B");
  });
});
