import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";
import { Link } from "@praxisjs/router";
import { Collection } from "@praxisjs/content";
import type { Entry, Resource } from "@praxisjs/content";

import { BlogPost } from "../content/blog";

@Head({ title: "Blog — PraxisJS", description: "Guides and references built with @praxisjs/content." })
@Route("/blog")
@Component()
export default class BlogPage extends StatefulComponent {
  @Collection(BlogPost) posts!: Resource<Entry<BlogPost>[]>;

  render() {
    return (
      <div class="page">
        <div class="page-hero" style="margin-bottom:32px">
          <h1>Blog</h1>
          <p>Guides and references built with <code>@praxisjs/content</code>.</p>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px">
          {() => this.posts.pending() && (
            <p style="color:var(--color-text-3)">Loading posts…</p>
          )}
          {() =>
            this.posts
              .data()
              ?.filter((p) => !p.data.draft)
              .map((p) => (
                <article style="padding:16px 20px;background:var(--color-bg-elv);border:1px solid var(--color-border);border-radius:10px">
                  <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px">
                    <h2 style="margin:0;font-size:1rem;font-weight:600">
                      <Link to={`/blog/${p.slug}`} style="color:var(--color-text);text-decoration:none">
                        {p.data.title}
                      </Link>
                    </h2>
                    <time style="font-size:.75rem;color:var(--color-text-3)">{p.data.date}</time>
                  </div>
                  {p.data.description && (
                    <p style="margin:0 0 10px;font-size:.86rem;color:var(--color-text-2);line-height:1.5">
                      {p.data.description}
                    </p>
                  )}
                  <div style="display:flex;gap:5px">
                    {p.data.tags.map((t) => (
                      <span style="padding:2px 8px;border-radius:99px;background:var(--color-brand-soft);color:var(--color-brand);font-size:.72rem;font-weight:500">
                        {t}
                      </span>
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
