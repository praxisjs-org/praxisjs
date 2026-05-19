import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route, Params } from "@praxisjs/router";
import { Link } from "@praxisjs/router";
import { Collection } from "@praxisjs/content";
import type { Entry, Resource } from "@praxisjs/content";
import type { Computed } from "@praxisjs/shared";
import type { RouteParams } from "@praxisjs/router";

import { BlogPost } from "../content/blog";

@Head((self: PostPage) => ({
  title: self.post ? `${self.post.data.title} — PraxisJS Blog` : "Blog — PraxisJS",
  description: self.post?.data.description ?? "",
  og: {
    title: self.post?.data.title,
    description: self.post?.data.description,
  },
}))
@Route("/blog/:slug")
@Component()
export default class PostPage extends StatefulComponent {
  @Params() params!: Computed<RouteParams>;
  @Collection(BlogPost) posts!: Resource<Entry<BlogPost>[]>;

  get post(): Entry<BlogPost> | null {
    const slug = this.params().slug;
    return this.posts.data()?.find((p) => p.slug === slug) ?? null;
  }

  render() {
    return (
      <div class="page">
        {() => {
          if (this.posts.pending()) {
            return <p style="color:var(--color-text-3)">Loading…</p>;
          }

          const p = this.post;
          if (!p) {
            return (
              <div>
                <p style="color:var(--color-text-3)">Post not found.</p>
                <Link to="/blog">← Back to blog</Link>
              </div>
            );
          }

          return (
            <article style="max-width:680px">
              <Link
                to="/blog"
                style="font-size:.82rem;color:var(--color-text-3);text-decoration:none;display:inline-block;margin-bottom:16px"
              >
                ← Back to blog
              </Link>

              <h1 style="margin:0 0 8px;font-size:1.9rem;line-height:1.25;color:var(--color-text)">
                {p.data.title}
              </h1>

              <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
                <time style="font-size:.8rem;color:var(--color-text-3)">{p.data.date}</time>
                <div style="display:flex;gap:4px">
                  {p.data.tags.map((t) => (
                    <span style="padding:2px 8px;border-radius:99px;background:var(--color-brand-soft);color:var(--color-brand);font-size:.72rem;font-weight:500">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div
                class="prose"
                style="font-size:.95rem;color:var(--color-text-2);line-height:1.8"
                innerHTML={p.html}
              />
            </article>
          );
        }}
      </div>
    );
  }
}
