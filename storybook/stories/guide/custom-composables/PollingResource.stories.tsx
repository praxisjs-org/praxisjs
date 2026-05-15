import { StatefulComponent, Composable } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { signal } from "@praxisjs/core/internal";
import type { Meta, StoryObj } from "@praxisjs/storybook";

class PollingResource<T> extends Composable {
  declare data: T | null;
  declare loading: boolean;
  declare refetch: () => void;

  constructor(
    private readonly url: string,
    private readonly interval = 5000,
  ) {
    super();
  }

  setup() {
    const data = signal<T | null>(null);
    const loading = signal(true);

    const doFetch = () => {
      loading.set(true);
      fetch(this.url)
        .then((r) => r.json() as Promise<T>)
        .then((v) => { data.set(v); loading.set(false); })
        .catch(() => { loading.set(false); });
    };

    doFetch();
    const timer = setInterval(doFetch, this.interval);
    this._stop = () => clearInterval(timer);

    return { data, loading, refetch: doFetch };
  }

  private _stop = () => {};
  onUnmount() { this._stop(); }
}

interface Post { id: number; title: string }

@Component()
class PollingDemo extends StatefulComponent {
  @Compose(PollingResource<Post>, "https://jsonplaceholder.typicode.com/posts/1", 15000)
  resource!: PollingResource<Post>;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:14px;font-family:sans-serif;min-width:300px">
        <h3 style="margin:0;font-size:1rem">PollingResource composable</h3>
        {() => this.resource.loading && !this.resource.data && (
          <p style="margin:0;font-size:.85rem;color:#9ca3af">Loading…</p>
        )}
        {() => this.resource.data && (
          <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px">
            <p style="margin:0 0 4px;font-weight:700;font-size:.9rem">#{this.resource.data!.id}</p>
            <p style="margin:0;font-size:.85rem;color:#6b7280">{this.resource.data!.title}</p>
          </div>
        )}
        <div style="display:flex;align-items:center;gap:10px">
          <button
            style="padding:6px 14px;border-radius:5px;border:none;background:#6d5bbd;color:#fff;cursor:pointer;font-size:.85rem"
            onClick={() => { this.resource.refetch(); }}
          >
            ↺ Refetch
          </button>
          {() => this.resource.loading && (
            <span style="font-size:.82rem;color:#9ca3af">Fetching…</span>
          )}
        </div>
        <p style="margin:0;font-size:.78rem;color:#aaa">
          Polls every 15s. <code>refetch()</code> is a plain function returned from <code>setup()</code>.
          All state is encapsulated in the composable — the component just uses it.
        </p>
      </div>
    );
  }
}

const meta: Meta = {
  title: "Guide/Custom Composables/PollingResource",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const PollingStory: Story = {
  name: "PollingResource — constructor args + refetch",
  render: () => <PollingDemo />,
};
