import { Collection, ContentSchema } from "@praxisjs/content";

@Collection("./posts/*.md")
export class Post extends ContentSchema {
  title = "";
  date = "";
  description = "";
  draft = false;
  tags: string[] = [];
}
