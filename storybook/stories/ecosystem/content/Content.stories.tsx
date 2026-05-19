import { StatefulComponent, StatelessComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Collection, ContentSchema } from "@praxisjs/content";
import type { Entry, Resource } from "@praxisjs/content";
import type { Meta, StoryObj } from "@praxisjs/storybook";

// ─── Mock markdown ────────────────────────────────────────────────────────────

const MOCK_GLOB = {
  "./posts/hello-world.md": `---
title: Hello, World
date: 2026-05-18
draft: false
tags: [intro]
---

Welcome to the blog! This content is loaded from a **markdown file**.`,

  "./posts/signals-101.md": `---
title: Signals 101
date: 2026-05-18
draft: false
tags: [signals]
---

Signals are the reactivity primitive in PraxisJS. Use \`@State()\` on fields and \`{() => ...}\` in JSX.`,

  "./posts/draft-post.md": `---
title: Draft Post
date: 2026-05-18
draft: true
tags: []
---

This post is a draft and will be filtered out.`,
};

// ─── Schema ───────────────────────────────────────────────────────────────────

@Collection(MOCK_GLOB)
class Post extends ContentSchema {
  title = "";
  date  = "";
  draft = false;
  tags: string[] = [];
}

// ─── Components ───────────────────────────────────────────────────────────────

@Component()
class PostCollection extends StatefulComponent {
  @Collection(Post) posts!: Resource<Entry<Post>[]>;

  render() {
    return (
      <div style="display:flex;flex-direction:column;gap:12px">
        {() => this.posts.data()
          ?.filter(p => !p.data.draft)
          .map(p => (
            <article style="padding:14px 16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff">
              <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px">
                <h3 style="margin:0;font-size:.95rem;color:#1c1830">{p.data.title}</h3>
                <time style="font-size:.75rem;color:#9ca3af;white-space:nowrap">{p.data.date}</time>
              </div>
              <div style="display:flex;gap:4px;margin-bottom:10px">
                {p.data.tags.map(t => (
                  <span style="padding:2px 7px;border-radius:99px;background:#ede9ff;color:#6d5bbd;font-size:.72rem">{t}</span>
                ))}
              </div>
              <div style="font-size:.85rem;color:#4b4668;line-height:1.6" innerHTML={p.html} />
            </article>
          ))
        }
        <p style="font-size:.75rem;color:#9ca3af;margin:0">
          3 files · 1 draft filtered · sorted by slug
        </p>
      </div>
    );
  }
}

@Component()
class ContentDemo extends StatelessComponent {
  render() {
    return (
      <div style="font-family:sans-serif;min-width:400px;max-width:580px">
        <h2 style="margin:0 0 16px;font-size:1rem;font-weight:700;color:#1c1830">Blog Posts</h2>
        <PostCollection />
      </div>
    );
  }
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: "Ecosystem/Content/Collection",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Default: Story = {
  name: "Content — collection list with draft filtering",
  render: () => <ContentDemo />,
};
