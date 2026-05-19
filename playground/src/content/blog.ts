import { Collection, ContentSchema } from "@praxisjs/content";

@Collection("./blog/*.md")
export class BlogPost extends ContentSchema {
  title = "";
  date = "";
  description = "";
  draft = false;
  tags: string[] = [];
}
