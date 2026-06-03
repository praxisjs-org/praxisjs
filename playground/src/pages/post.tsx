import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route, Params } from "@praxisjs/router";
import { Link } from "@praxisjs/router";
import { Collection } from "@praxisjs/content";
import type { Entry, Resource } from "@praxisjs/content";
import type { RouteParams } from "@praxisjs/router";
import { Stylesheet, Styled } from "@praxisjs/css";

import { BlogPost } from "../content/blog";

// ─── Styles ───────────────────────────────────────────────────────────────────

class PostStyles extends Stylesheet {
  $back = this.css({
    fontSize: ".82rem",
    color: "var(--color-text-3)",
    textDecoration: "none",
    display: "inline-block",
    marginBottom: "16px",
  }).hover({ color: "var(--color-brand)" });

  $article = this.css({ maxWidth: "680px" });

  $title = this.css({
    margin: "0 0 8px",
    fontSize: "1.9rem",
    lineHeight: "1.25",
    color: "var(--color-text)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  });

  $meta = this.css({
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "24px",
  });

  $date = this.css({
    fontSize: ".8rem",
    color: "var(--color-text-3)",
  });

  $tags = this.css({ display: "flex", gap: "4px" });

  $tag = this.css({
    padding: "2px 8px",
    borderRadius: "99px",
    background: "var(--color-brand-soft)",
    color: "var(--color-brand)",
    fontSize: ".72rem",
    fontWeight: 500,
  });

  $prose = this.css({ fontSize: ".95rem", color: "var(--color-text-2)", lineHeight: "1.8" });

  $notFound = this.css({
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  });

  $loading = this.css({ color: "var(--color-text-3)" });
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  @Params() params!: RouteParams;
  @Collection(BlogPost) posts!: Resource<Entry<BlogPost>[]>;
  @Styled(PostStyles) $s!: PostStyles;

  get post(): Entry<BlogPost> | null {
    const slug = this.params().slug;
    return this.posts.data()?.find((p) => p.slug === slug) ?? null;
  }

  render() {
    return (
      <div class="page">
        {() => {
          if (this.posts.pending()) {
            return <p class={this.$s.$loading}>Loading…</p>;
          }

          const p = this.post;
          if (!p) {
            return (
              <div class={this.$s.$notFound}>
                <p class={this.$s.$loading}>Post not found.</p>
                <Link to="/blog">← Back to blog</Link>
              </div>
            );
          }

          return (
            <article class={this.$s.$article}>
              <Link to="/blog" class={this.$s.$back}>
                ← Back to blog
              </Link>

              <h1 class={this.$s.$title}>{p.data.title}</h1>

              <div class={this.$s.$meta}>
                <time class={this.$s.$date}>{p.data.date}</time>
                <div class={this.$s.$tags}>
                  {p.data.tags.map((t) => (
                    <span class={this.$s.$tag}>{t}</span>
                  ))}
                </div>
              </div>

              <div
                class={`${this.$s.$prose} prose`}
                innerHTML={p.html}
              />
            </article>
          );
        }}
      </div>
    );
  }
}
