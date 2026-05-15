import { StatefulComponent } from "@praxisjs/core";
import { Component, Resource, ResourceInstance } from "@praxisjs/decorators";
import type { Meta, StoryObj } from "@praxisjs/storybook";

interface Post {
  id: number;
  title: string;
  body: string;
}

@Component()
class ManualFetchDemo extends StatefulComponent {
  @Resource(
    () => fetch("https://jsonplaceholder.typicode.com/posts/1").then((r) => r.json() as Promise<Post>),
    { immediate: false },
  )
  post!: ResourceInstance<Post>;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:320px">
        <h3 style="margin:0;font-size:1rem">@Resource — <code>immediate: false</code></h3>
        <p style="margin:0;font-size:.85rem;color:#666">
          Status: <strong>{() => this.post.status()}</strong>
        </p>
        <button
          style="padding:7px 18px;border-radius:6px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;align-self:start"
          onClick={() => { void this.post.refetch(); }}
          disabled={() => this.post.pending()}
        >
          {() => this.post.pending() ? "Loading…" : "Fetch post"}
        </button>
        {() => this.post.data() && (
          <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px">
            <p style="margin:0 0 4px;font-weight:700;font-size:.9rem">{this.post.data()!.title}</p>
            <p style="margin:0;font-size:.82rem;color:#6b7280">{this.post.data()!.body}</p>
          </div>
        )}
        <p style="margin:0;font-size:.78rem;color:#aaa">
          <code>immediate: false</code> starts in <em>idle</em> status — no fetch until you call <code>.refetch()</code>.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Essentials/Async Data/ManualFetch",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const ManualFetch: Story = {
  name: "@Resource — immediate: false",
  render: () => <ManualFetchDemo />,
};
