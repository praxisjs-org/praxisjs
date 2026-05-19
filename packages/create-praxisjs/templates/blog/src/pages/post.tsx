import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Route, Params } from "@praxisjs/router";
import { Link } from "@praxisjs/router";
import { Collection } from "@praxisjs/content";
import type { Entry, Resource } from "@praxisjs/content";
import type { Computed } from "@praxisjs/shared";
import type { RouteParams } from "@praxisjs/router";

import { Post } from "../content/posts";

@Route("/blog/:slug")
@Component()
export default class PostPage extends StatefulComponent {
  @Params() params!: Computed<RouteParams>;
  @Collection(Post) posts!: Resource<Entry<Post>[]>;

  get post(): Entry<Post> | null {
    const slug = this.params().slug;
    return this.posts.data()?.find((p) => p.slug === slug) ?? null;
  }

  render() {
    return (
      <div class="page">
        {() => {
          if (this.posts.pending()) return <p class="loading">Loading…</p>;

          const p = this.post;
          if (!p) {
            return (
              <div class="not-found">
                <h1>Post not found</h1>
                <Link to="/blog">← Back to blog</Link>
              </div>
            );
          }

          return (
            <article class="post">
              <header class="post-header">
                <Link to="/blog" class="post-back">← Back to blog</Link>
                <h1 class="post-title">{p.data.title}</h1>
                <div class="post-meta">
                  <time class="post-date">{p.data.date}</time>
                  <div class="post-tags">
                    {p.data.tags.map((t) => (
                      <span class="tag">{t}</span>
                    ))}
                  </div>
                </div>
              </header>
              <div class="post-body" innerHTML={p.html} />
            </article>
          );
        }}
      </div>
    );
  }
}
