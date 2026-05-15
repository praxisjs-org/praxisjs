import { StatefulComponent } from "@praxisjs/core";
import { Component, State, Resource, ResourceInstance } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface Post {
  id: number;
  title: string;
  body: string;
}

@Component()
class AsyncDataDemo extends StatefulComponent {
  @State() page = 1;

  @Resource(
    () => fetch(`https://jsonplaceholder.typicode.com/posts?_page=${this.page}&_limit=4`).then((r) => r.json() as Promise<Post[]>),
    { keepPreviousData: true },
  )
  posts!: ResourceInstance<Post[]>;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:340px;max-width:480px">
        <h3 style="margin:0;font-size:1rem">@Resource — reactive async data</h3>

        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button
            disabled={() => this.page <= 1}
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.page--; }}
          >
            ← Prev
          </button>
          <span style="font-size:.88rem;color:#555;font-variant-numeric:tabular-nums">
            Page {() => this.page}
          </span>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;cursor:pointer"
            onClick={() => { this.page++; }}
          >
            Next →
          </button>
          <button
            style="padding:6px 14px;border-radius:6px;border:1px solid #6d5bbd;color:#6d5bbd;background:#fff;cursor:pointer"
            onClick={() => { void this.posts.refetch(); }}
          >
            ↺ Refetch
          </button>
          {() => this.posts.pending() && (
            <span style="font-size:.82rem;color:#9ca3af">Loading…</span>
          )}
        </div>

        {() => this.posts.error() && (
          <div style="padding:10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;color:#b91c1c;font-size:.85rem">
            Error: {String(this.posts.error())}
          </div>
        )}

        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px">
          {() => (this.posts.data() ?? []).map((post) => (
            <li style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px">
              <p style="margin:0 0 4px;font-weight:600;font-size:.88rem;color:#374151">
                #{post.id} {post.title}
              </p>
              <p style="margin:0;font-size:.8rem;color:#9ca3af;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">
                {post.body}
              </p>
            </li>
          ))}
        </ul>

        <div style="padding:10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:.78rem;color:#0369a1">
          <strong>How it works:</strong> <code>page</code> is a <code>@State()</code> signal read inside the fetcher.
          When page changes, the resource auto-cancels the in-flight request and starts a new one.
          <code>keepPreviousData: true</code> prevents the list from flashing empty during navigation.
        </div>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Async Data/Resource",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Pagination: Story = {
  name: "@Resource — pagination with keepPreviousData",
  render: () => <AsyncDataDemo />,
};
