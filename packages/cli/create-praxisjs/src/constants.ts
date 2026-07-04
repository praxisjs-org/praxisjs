export const TEMPLATES = [
  {
    name: "minimal",
    display: "Minimal",
    description: "Signals, decorators, class components",
  },
  {
    name: "router",
    display: "With Router",
    description: "Minimal + @praxisjs/router for client-side routing",
  },
  {
    name: "full",
    display: "Full",
    description: "Router + store + di + composables + concurrent + devtools",
  },
  {
    name: "blog",
    display: "Blog",
    description: "Router + @praxisjs/content — markdown blog with frontmatter and reactive collections",
  },
] as const;

export type TemplateName = (typeof TEMPLATES)[number]["name"];

export const RENAME_MAP: Record<string, string> = {
  _gitignore: ".gitignore",
};
