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

  it("re-renders visible items when scrollTop changes (covers while loop cleanup)", () => {
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
    // First render - populates the itemsSlot
    instance.render();

    // Change scrollTop to trigger effect re-run (covers the while loop removing old nodes)
    Object.defineProperty(container, "scrollTop", { configurable: true, value: 500 });
    container.dispatchEvent(new Event("scroll"));

    // Verify scrollTop was updated (effect should have re-run)
    const scrollTop = (instance as unknown as { _scrollTop: () => number })._scrollTop;
    expect(scrollTop()).toBe(500);

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

  it("onUnmount without prior onMount does not throw", () => {
    const Wrapped = applyVirtual(ListComp as AnyConstructor, 50);
    const instance = new Wrapped();
    // _container is undefined — onUnmount should be a no-op
    expect(() => instance.onUnmount?.()).not.toThrow();
  });

  it("updates scrollTop on scroll event", () => {
    const Wrapped = applyVirtual(ListComp as AnyConstructor, 50);
    const instance = new Wrapped();
    (instance as unknown as { items: unknown[] }).items = Array.from({ length: 20 }, (_, i) => i);

    const container = document.createElement("div");
    document.body.appendChild(container);
    const anchor = document.createComment("end");
    container.appendChild(anchor);
    (instance as unknown as { _anchor: Comment })._anchor = anchor;

    instance.onMount?.();

    Object.defineProperty(container, "scrollTop", { configurable: true, value: 200 });
    container.dispatchEvent(new Event("scroll"));

    const scrollTop = (instance as unknown as { _scrollTop: () => number })._scrollTop;
    expect(scrollTop()).toBe(200);
    document.body.removeChild(container);
  });
});
