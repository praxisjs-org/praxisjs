import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { Pagination } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

@Component()
class PaginationDemo extends StatefulComponent {
  @Compose(Pagination, { total: 87, pageSize: 10 })
  pages!: Pagination;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:280px">
        <h3 style="margin:0;font-size:1rem">Pagination — page state management</h3>
        <div style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:.88rem;color:#555">
          Showing {() => this.pages.offset + 1}–{() => Math.min(this.pages.offset + 10, 87)} of 87 items
          · Page <strong>{() => this.pages.page}</strong> of <strong>{() => this.pages.totalPages}</strong>
        </div>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
          <button
            disabled={() => !this.pages.hasPrev}
            style="padding:6px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.pages.first(); }}
          >«</button>
          <button
            disabled={() => !this.pages.hasPrev}
            style="padding:6px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.pages.prev(); }}
          >‹ Prev</button>
          {() => (this.pages.pages as number[]).map((n: number) => (
            <button
              key={n}
              style={() => `padding:6px 10px;border-radius:5px;border:1px solid ${this.pages.page === n ? "#6d5bbd" : "#e5e7eb"};background:${this.pages.page === n ? "#6d5bbd" : "#fff"};color:${this.pages.page === n ? "#fff" : "#374151"};cursor:pointer;font-size:.82rem;font-weight:${this.pages.page === n ? "700" : "400"}`}
              onClick={() => { this.pages.goTo(n); }}
            >{n}</button>
          ))}
          <button
            disabled={() => !this.pages.hasNext}
            style="padding:6px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.pages.next(); }}
          >Next ›</button>
          <button
            disabled={() => !this.pages.hasNext}
            style="padding:6px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.pages.last(); }}
          >»</button>
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>pages.offset</code> gives the slice start for API calls.
          <code>hasPrev/hasNext</code>, <code>prev()/next()</code>, <code>goTo(n)</code>, <code>first()/last()</code>.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Composables/Browser/Pagination",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const PaginationStory: Story = {
  name: "Pagination — page state",
  render: () => <PaginationDemo />,
};
