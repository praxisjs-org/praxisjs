import { StatefulComponent } from "@praxisjs/core";
import { Component, Compose } from "@praxisjs/decorators";
import { Collection, ContentSchema, PagedCollection, getTotal } from "@praxisjs/content";
import type { Entry, Resource } from "@praxisjs/content";
import { Pagination } from "@praxisjs/composables";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Mock markdown ─────────────────────────────────────────────────────────────

const MOCK_GLOB = {
  "./articles/async-primitives.md": `---
title: Async Data with resource()
date: 2026-05-18
category: Core
---
\`resource(fetcher)\` wraps any async function and returns a reactive object with \`.data()\`, \`.pending()\`, \`.error()\`, and \`.refetch()\`. The fetcher re-runs automatically whenever a signal it reads changes, making server-driven pagination or filtered queries trivial — change a page signal, the resource re-fetches.`,

  "./articles/computed-signals.md": `---
title: Computed Signals
date: 2026-05-18
category: Reactivity
---
\`computed(() => expr)\` creates a lazily-evaluated, memoized signal. It only re-runs when one of its reactive dependencies changes, and multiple readers share the same cached result. Use \`peek(sig)\` inside a computed to read a signal without creating a dependency — useful when you need the current value without subscribing to future updates.`,

  "./articles/decorator-ordering.md": `---
title: Decorator Ordering
date: 2026-05-18
category: Decorators
---
Field decorators in PraxisJS apply inner-first: the decorator closest to the field name runs first. Always put \`@State()\` or \`@Prop()\` directly above the field, with behavioural decorators like \`@Watch()\` or \`@Debounce()\` stacked above them. Class decorators apply bottom-up — \`@Component()\` must be the innermost class decorator so it runs before any scope or module wrapper.`,

  "./articles/effect-cleanup.md": `---
title: Effect Cleanup
date: 2026-05-18
category: Reactivity
---
An \`effect(() => { ... })\` can return a cleanup function. PraxisJS calls it before the effect re-runs and when the owning scope is disposed. This is the right place to clear timers, remove event listeners, or abort in-flight requests — preventing memory leaks when reactive state drives side effects.`,

  "./articles/jsx-reactivity.md": `---
title: JSX Reactivity Model
date: 2026-05-18
category: JSX
---
\`render()\` always runs inside \`untrack()\`, so reading a signal there is safe and returns a snapshot — no accidental subscriptions. To create a reactive DOM binding, wrap the expression in an arrow function: \`{() => this.count}\`. PraxisJS installs a fine-grained \`effect\` for each arrow function, updating only that text node or attribute when its dependencies change.`,

  "./articles/routing-basics.md": `---
title: Client-side Routing
date: 2026-05-18
category: Router
---
Decorate your root component with \`@Router([...])\` and pass an array of route definitions. Each route maps a \`path\` pattern to a \`component\` constructor. Nest routes to compose layouts — child routes render inside the parent's \`<RouterOutlet />\`. Use \`@Router()\` on a field to inject the \`RouterInstance\` and call \`.push(path)\` or \`.replace(path)\` for imperative navigation.`,

  "./articles/signals-intro.md": `---
title: Introduction to Signals
date: 2026-05-18
category: Core
---
Signals are the reactivity primitive: \`signal(0)\` returns a getter-setter pair. Call it with no arguments to read the current value and subscribe the surrounding effect; call it with a value to update and schedule dependents. \`batch(() => { ... })\` groups multiple signal writes into a single flush, preventing intermediate renders. \`untrack(() => sig())\` reads without subscribing.`,

  "./articles/store-pattern.md": `---
title: Global State with @Storable
date: 2026-05-18
category: Store
---
Extend \`ReactiveStore\` and apply \`@Storable()\` to create a singleton store. Fields decorated with \`@State()\` or \`@DeepState()\` become reactive across all consumers. Inject the store into any component with \`@Store(MyStore) store!: MyStore\` — you get the same shared instance every time, and components re-render only when the specific signals they read actually change.`,
};

// ─── Schema ───────────────────────────────────────────────────────────────────

@Collection(MOCK_GLOB)
class Article extends ContentSchema {
  title    = "";
  date     = "";
  category = "";
}

const PAGE_SIZE = 3;
const TOTAL     = getTotal(Article);

// ─── Component ────────────────────────────────────────────────────────────────

@Component()
class PaginatedArticles extends StatefulComponent {
  @Compose(Pagination, { total: TOTAL, pageSize: PAGE_SIZE })
  pager!: Pagination;

  @PagedCollection(Article, "pager")
  articles!: Resource<Entry<Article>[]>;

  render() {
    return (
      <div style="font-family:sans-serif;min-width:400px;max-width:600px;display:flex;flex-direction:column;gap:16px">
        <div style="display:flex;align-items:baseline;justify-content:space-between">
          <h2 style="margin:0;font-size:1rem;font-weight:700;color:#1c1830">Articles</h2>
          <span style="font-size:.78rem;color:#9ca3af">
            {() => `${TOTAL} total · page ${this.pager.page} of ${this.pager.totalPages}`}
          </span>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;min-height:240px">
          {() => this.articles.pending() && (
            <p style="margin:0;font-size:.85rem;color:#9ca3af">Loading…</p>
          )}
          {() => this.articles.data()?.map((p: Entry<Article>) => (
            <article style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px">
                <h3 style="margin:0;font-size:.9rem;font-weight:600;color:#1c1830">{p.data.title}</h3>
                <span style="padding:2px 8px;border-radius:99px;background:#ede9ff;color:#6d5bbd;font-size:.7rem;white-space:nowrap;flex-shrink:0">
                  {p.data.category}
                </span>
              </div>
              <div style="font-size:.82rem;color:#4b4668;line-height:1.6" innerHTML={p.html} />
            </article>
          ))}
        </div>

        <div style="display:flex;gap:4px;align-items:center;justify-content:center;flex-wrap:wrap">
          <button
            disabled={() => !this.pager.hasPrev}
            style="padding:6px 10px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.pager.first(); }}
          >«</button>
          <button
            disabled={() => !this.pager.hasPrev}
            style="padding:6px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.pager.prev(); }}
          >‹ Prev</button>
          {() => (this.pager.pages as number[]).map((n: number) => (
            <button
              key={n}
              style={() => `padding:6px 10px;border-radius:5px;border:1px solid ${this.pager.page === n ? "#6d5bbd" : "#e5e7eb"};background:${this.pager.page === n ? "#6d5bbd" : "#fff"};color:${this.pager.page === n ? "#fff" : "#374151"};cursor:pointer;font-size:.82rem;font-weight:${this.pager.page === n ? "700" : "400"}`}
              onClick={() => { this.pager.goTo(n); }}
            >{n}</button>
          ))}
          <button
            disabled={() => !this.pager.hasNext}
            style="padding:6px 12px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.pager.next(); }}
          >Next ›</button>
          <button
            disabled={() => !this.pager.hasNext}
            style="padding:6px 10px;border-radius:5px;border:1px solid #e5e7eb;background:#fff;cursor:pointer;font-size:.82rem"
            onClick={() => { this.pager.last(); }}
          >»</button>
        </div>

        <p style="margin:0;font-size:.75rem;color:#9ca3af;text-align:center">
          <code>@PagedCollection(Article, 'pager')</code> loads only the visible slice,
          re-fetching automatically when <code>pager.page</code> changes.
        </p>
      </div>
    );
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Content/Pagination",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const PaginatedContent: Story = {
  name: "Content — paginated collection with Pagination composable",
  render: () => <PaginatedArticles />,
};
