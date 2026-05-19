---
title: Content Collections
date: 2026-05-18
description: Load markdown files with @Collection — frontmatter validation, reactive resource, and zero runtime fetches.
draft: false
tags: [content, markdown]
---

# Content Collections

`@praxisjs/content` lets you load `.md` files as a reactive collection.

## Define a schema

Create one file per collection. Fields and their default values define the frontmatter shape:

```typescript
// src/content/blog.ts
@Collection('./blog/*.md')
export class BlogPost extends ContentSchema {
  title = ''
  date  = ''
  draft = false
  tags: string[] = []
}
```

## Use in a component

```tsx
@Component()
class BlogList extends StatefulComponent {
  @Collection(BlogPost) posts!: Resource<Entry<BlogPost>[]>

  render() {
    return (
      <div>
        {() => this.posts.data()
          ?.filter(p => !p.data.draft)
          .map(p => <h2>{p.data.title}</h2>)
        }
      </div>
    )
  }
}
```

## How it works

The Vite plugin transforms `@Collection('./blog/*.md')` into an `import.meta.glob` call at build time. Files are bundled inline — zero network requests, works identically in dev and production.
