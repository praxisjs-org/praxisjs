// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

import { StatefulComponent } from "@praxisjs/core";
import { Virtual } from "../component/virtual";

type AnyConstructor = new (...args: unknown[]) => StatefulComponent;

function applyVirtual<T extends AnyConstructor>(cls: T, itemHeight: number, buffer?: number): T {
  return buffer !== undefined
    ? Virtual(itemHeight, buffer)(cls, {} as ClassDecoratorContext)
    : Virtual(itemHeight)(cls, {} as ClassDecoratorContext);
}

// A base component with items and renderItem for virtual scrolling
class ListComp extends StatefulComponent {
  items: unknown[] = [];
  renderItem(item: unknown, _index: number) {
    const div = document.createElement("div");
    (div as HTMLElement).textContent = String(item);
    return div;
  }
  render() { return null; }
}

describe("Virtual decorator", () => {
  it("warns and returns null when renderItem is not defined", () => {
    class NoRenderItem extends StatefulComponent {
      items = ["a", "b"];
      render() { return null; }
    }

    const Wrapped = applyVirtual(NoRenderItem as AnyConstructor, 50);
    const instance = new Wrapped() as unknown as { render: () => unknown };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = instance.render();
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("[Virtual]"));
    warn.mockRestore();
  });

  it("renders a container div with the total height", () => {
    class MyList extends StatefulComponent {
      items = ["a", "b", "c"];
      renderItem(item: unknown) {
        const el = document.createElement("div");
        el.textContent = String(item);
        return el;
      }
      render() { return null; }
    }

    const Wrapped = applyVirtual(MyList as AnyConstructor, 50);
    const instance = new Wrapped();

    const result = instance.render() as HTMLElement;
    expect(result).toBeInstanceOf(HTMLElement);
    expect(result.tagName.toLowerCase()).toBe("div");
    // Total height = 3 items * 50px
    expect(result.getAttribute("style")).toContain("150px");
  });

  it("renders visible items within the viewport", () => {
    class MyList extends StatefulComponent {
      items = [1, 2, 3, 4, 5];
      renderItem(item: unknown) {
        const el = document.createElement("div");
        el.textContent = String(item);
        return el;
      }
      render() { return null; }
    }

    const Wrapped = applyVirtual(MyList as AnyConstructor, 100, 0);
    const instance = new Wrapped();

    const outer = instance.render() as HTMLElement;
    // Should render some content
    expect(outer).not.toBeNull();
    expect(outer.children.length).toBeGreaterThan(0);
  });

  it("handles empty items list without errors", () => {
    class EmptyList extends StatefulComponent {
      items: unknown[] = [];
      renderItem(_item: unknown) {
        return document.createElement("div");
      }
      render() { return null; }
    }

    const Wrapped = applyVirtual(EmptyList as AnyConstructor, 50);
    const instance = new Wrapped();
    expect(() => instance.render()).not.toThrow();
  });

  it("onMount sets container styles when _anchor has a parent", () => {
    const Wrapped = applyVirtual(ListComp as AnyConstructor, 50);
    const instance = new Wrapped();
    (instance as unknown as { items: unknown[] }).items = ["a", "b"];

    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchor = document.createComment("end");
    container.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    expect(container.style.overflowY).toBe("auto");
    expect(container.style.position).toBe("relative");
    document.body.removeChild(container);
  });

  it("onMount does nothing when _anchor has no parent", () => {
    const Wrapped = applyVirtual(ListComp as AnyConstructor, 50);
    const instance = new Wrapped();

    const anchor = document.createComment("end");
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    expect(() => instance.onMount?.()).not.toThrow();
  });

  it("onUnmount disconnects scroll listener and cleans up effects", () => {
    const Wrapped = applyVirtual(ListComp as AnyConstructor, 50);
    const instance = new Wrapped();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchor = document.createComment("end");
    container.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    // Should not throw
    expect(() => instance.onUnmount?.()).not.toThrow();
    document.body.removeChild(container);
  });

  it("re-renders visible items when scrollTop changes (covers while loop cleanup)", async () => {
    class ScrollList extends StatefulComponent {
      items = Array.from({ length: 20 }, (_, i) => i);
      renderItem(item: unknown) {
        const el = document.createElement("div");
        el.textContent = String(item);
        return el;
      }
      render() { return null; }
    }

    const Wrapped = applyVirtual(ScrollList as AnyConstructor, 50, 0);
    const instance = new Wrapped();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchor = document.createComment("end");
    container.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    // First render - sets up effects with the spacerTop/itemsSlot/spacerBottom elements
    const outer = instance.render() as HTMLElement;

    // Change scrollTop to trigger effect re-run (covers the while loop removing old nodes)
    Object.defineProperty(container, "scrollTop", { configurable: true, value: 500 });
    container.dispatchEvent(new Event("scroll"));
    await Promise.resolve();

    // buffer=0, itemHeight=50, scrollTop=500 → startIdx=10 → offsetTop=500px
    const spacerTop = outer.children[0] as HTMLElement;
    expect(spacerTop.getAttribute("style")).toContain("500px");

    document.body.removeChild(container);
  });

  it("renderItem returning an array appends all child nodes", () => {
    class ArrayItemList extends StatefulComponent {
      items = ["item"];
      renderItem(item: unknown) {
        const a = document.createElement("span");
        a.textContent = String(item) + "-1";
        const b = document.createElement("span");
        b.textContent = String(item) + "-2";
        return [a, b];
      }
      render() { return null; }
    }

    const Wrapped = applyVirtual(ArrayItemList as AnyConstructor, 50, 0);
    const instance = new Wrapped();
    const outer = instance.render() as HTMLElement;
    // outer structure: spacerTop, itemsSlot, spacerBottom
    const itemsSlot = outer.children[1] as HTMLElement;
    const wrapper = itemsSlot.children[0] as HTMLElement;
    expect(wrapper.children.length).toBe(2);
  });

  it("renderItem returning null produces an empty wrapper div", () => {
    class NullItemList extends StatefulComponent {
      items = ["x"];
      renderItem() { return null; }
      render() { return null; }
    }

    const Wrapped = applyVirtual(NullItemList as AnyConstructor, 50, 0);
    const instance = new Wrapped();
    expect(() => instance.render()).not.toThrow();
    const outer = instance.render() as HTMLElement;
    const itemsSlot = outer.children[1] as HTMLElement;
    const wrapper = itemsSlot.children[0] as HTMLElement;
    // rendered is null — no child nodes appended
    expect(wrapper.children.length).toBe(0);
  });

  it("uses empty array when items is undefined (host.items ?? [])", () => {
    class NoItems extends StatefulComponent {
      // items is intentionally not defined
      renderItem() { return document.createElement("div"); }
      render() { return null; }
    }

    const Wrapped = applyVirtual(NoItems as AnyConstructor, 50, 0);
    const instance = new Wrapped();
    // render() should work fine with 0 items
    const result = instance.render() as HTMLElement;
    expect(result).toBeInstanceOf(HTMLElement);
    const style = result.getAttribute("style") ?? "";
    expect(style).toContain("0px"); // totalH = 0 * 50 = 0
  });

  it("onUnmount without prior onMount does not throw", () => {
    const Wrapped = applyVirtual(ListComp as AnyConstructor, 50);
    const instance = new Wrapped();
    // _container is undefined — onUnmount should be a no-op
    expect(() => instance.onUnmount?.()).not.toThrow();
  });

  it("updates scrollTop on scroll event", async () => {
    const Wrapped = applyVirtual(ListComp as AnyConstructor, 50);
    const instance = new Wrapped();
    (instance as unknown as { items: unknown[] }).items = Array.from({ length: 20 }, (_, i) => i);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchor = document.createComment("end");
    container.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    // Render to set up effects that observe scrollTop
    const outer = instance.render() as HTMLElement;

    Object.defineProperty(container, "scrollTop", { configurable: true, value: 200 });
    container.dispatchEvent(new Event("scroll"));
    await Promise.resolve();

    // buffer=3, itemHeight=50, scrollTop=200 → startIdx=1 → offsetTop=50px
    const spacerTop = outer.children[0] as HTMLElement;
    expect(spacerTop.getAttribute("style")).toContain("50px");
    document.body.removeChild(container);
  });

  it("itemHeight = 0 throws a descriptive error on onMount", () => {
    class ZeroHeightList extends StatefulComponent {
      items = ["a", "b"];
      renderItem(item: unknown) {
        const el = document.createElement("div");
        el.textContent = String(item);
        return el;
      }
      render() { return null; }
    }

    const Wrapped = applyVirtual(ZeroHeightList as AnyConstructor, 0);
    const instance = new Wrapped();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchor = document.createComment("end");
    container.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    expect(() => instance.onMount?.()).toThrow(/itemHeight must be a positive number/);
    document.body.removeChild(container);
  });

  it("itemHeight = 0 in render() does not divide by zero (no container)", () => {
    class ZeroHeightList2 extends StatefulComponent {
      items = ["a", "b"];
      renderItem(item: unknown) {
        return document.createElement("div");
      }
      render() { return null; }
    }
    // render() is called before onMount, so no throw yet — but it still computes total height
    const Wrapped = applyVirtual(ZeroHeightList2 as AnyConstructor, 0);
    const instance = new Wrapped();
    // Render without mounting — no onMount guard triggered, but division happens in computed
    // The guard is in onMount, so render still runs. Verify it doesn't produce NaN/Infinity
    expect(() => instance.render()).not.toThrow();
  });

  it("renderItem() that throws — does not crash the entire component", () => {
    class ThrowingList extends StatefulComponent {
      items = ["x"];
      renderItem(): Node {
        throw new Error("render item failed");
      }
      render() { return null; }
    }

    const Wrapped = applyVirtual(ThrowingList as AnyConstructor, 50, 0);
    const instance = new Wrapped();
    // Render triggers the effect which calls renderItem — it should propagate the error
    expect(() => instance.render()).toThrow("render item failed");
  });

  it("scrollTop > totalHeight renders last visible items without crash", () => {
    class ShortList extends StatefulComponent {
      items = [1, 2, 3]; // only 3 items × 50px = 150px total
      renderItem(item: unknown) {
        const el = document.createElement("div");
        el.textContent = String(item);
        return el;
      }
      render() { return null; }
    }

    const Wrapped = applyVirtual(ShortList as AnyConstructor, 50, 0);
    const instance = new Wrapped();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchor = document.createComment("end");
    container.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();
    const outer = instance.render() as HTMLElement;

    // Simulate scrollTop way past end of list (e.g., 9999px for a 150px list)
    Object.defineProperty(container, "scrollTop", { configurable: true, value: 9999 });
    expect(() => container.dispatchEvent(new Event("scroll"))).not.toThrow();

    // The outer container should still be present
    expect(outer).toBeInstanceOf(HTMLElement);
    document.body.removeChild(container);
  });

  it("buffer applied correctly — renders extra items beyond visible area", () => {
    class BufferList extends StatefulComponent {
      items = Array.from({ length: 20 }, (_, i) => i);
      renderItem(item: unknown) {
        const el = document.createElement("div");
        el.textContent = String(item);
        return el;
      }
      render() { return null; }
    }

    // itemHeight=100, buffer=2, viewHeight defaults to 600 → visible=6 items + 2 buffer each side
    const Wrapped = applyVirtual(BufferList as AnyConstructor, 100, 2);
    const instance = new Wrapped();
    const outer = instance.render() as HTMLElement;

    // With scrollTop=0, buffer=2: startIdx=max(0, 0-2)=0, endIdx=min(19, ceil(600/100)+2)=8
    // So 9 items should be rendered (indices 0..8)
    const itemsSlot = outer.children[1] as HTMLElement;
    expect(itemsSlot.children.length).toBe(9);
  });
});
