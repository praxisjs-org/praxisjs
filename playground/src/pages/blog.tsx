import { StatefulComponent } from "@praxisjs/core";
import { Component } from "@praxisjs/decorators";
import { Head } from "@praxisjs/head";
import { Route } from "@praxisjs/router";
import { Link } from "@praxisjs/router";
import { Collection } from "@praxisjs/content";
import type { Entry, Resource } from "@praxisjs/content";
import { Styled } from "@praxisjs/css";

import { BlogPost } from "../content/blog";
import { PageStyles, BlogStyles } from "../shared-styles";

@Head({ title: "Blog — PraxisJS", description: "Guides and references built with @praxisjs/content." })
@Route("/blog")
@Component()
export default class BlogPage extends StatefulComponent {
  @Collection(BlogPost) posts!: Resource<Entry<BlogPost>[]>;

  @Styled(PageStyles)  $page!: PageStyles;
  @Styled(BlogStyles)  $blog!: BlogStyles;

  render() {
    return (
      <div class={this.$page.$page}>
        <div class={this.$page.$hero}>
          <h1 class={this.$page.$heroH1}>Blog</h1>
          <p class={this.$page.$heroP}>
            Guides and references built with <code>@praxisjs/content</code>.
          </p>
        </div>

        <div class={this.$blog.$list}>
          {() => this.posts.pending() && (
            <p class={this.$blog.$loading}>Loading posts…</p>
          )}
          {() => this.posts.data()
            ?.filter((p) => !p.data.draft)
            .map((p) => (
              <article class={this.$blog.$article}>
                <div class={this.$blog.$articleHeader}>
                  <h2 class={this.$blog.$articleTitle}>
                    <Link to={`/blog/${p.slug}`} class={this.$blog.$articleLink}>
                      {p.data.title}
                    </Link>
                  </h2>
                  <time class={this.$blog.$date}>{p.data.date}</time>
                </div>
                {p.data.description && (
                  <p class={this.$blog.$desc}>{p.data.description}</p>
                )}
                <div class={this.$blog.$tags}>
                  {p.data.tags.map((t) => (
                    <span class={this.$blog.$tag}>{t}</span>
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
