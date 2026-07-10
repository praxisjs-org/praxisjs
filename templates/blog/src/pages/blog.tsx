import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Route } from "@praxisjs/router";
import { Link } from "@praxisjs/router";
import { Collection } from "@praxisjs/content";
import type { Entry, Resource } from "@praxisjs/content";

import { Post } from "../content/posts";

@Route("/blog")
@Component()
export default class BlogPage extends StatefulComponent {
  @Collection(Post) posts!: Resource<Entry<Post>[]>;

  render() {
    return (
      <div class="page">
        <span class="eyebrow">Latest posts</span>
        <h1 class="page-title">Blog</h1>
        <div class="post-list">
          {() => this.posts.pending() && <p class="loading">Loading posts…</p>}
          {() =>
            this.posts
              .data()
              ?.filter((p) => !p.data.draft)
              .map((p) => (
                <article class="post-card">
                  <h2 class="post-card-title">
                    <Link to={`/blog/${p.slug}`}>{p.data.title}</Link>
                  </h2>
                  <time class="post-card-date">{p.data.date}</time>
                  {p.data.description && (
                    <p class="post-card-description">{p.data.description}</p>
                  )}
                  <div class="post-card-tags">
                    {p.data.tags.map((t) => (
                      <span class="tag">{t}</span>
                    ))}
                  </div>
                </article>
              ))
          }
        </div>
      </div>
    );
  }
}
