import type { Resource } from "@praxisjs/core/internal";

export type GlobImport =
  | Record<string, string>
  | Record<string, () => Promise<string>>;

export interface CollectionConfig {
  glob: GlobImport;
  render?: (markdown: string) => string;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export abstract class ContentSchema {}

export interface Entry<S extends ContentSchema> {
  slug: string;
  data: S;
  body: string;
  html: string;
}

export interface PageOptions {
  page: number;
  pageSize: number;
}

export type { Resource };
