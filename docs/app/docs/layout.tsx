import { source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      tabs={[
        {
          title: "Documentation",
          description: "Guides, API reference, and ecosystem packages",
          url: "/docs",
        },
        {
          title: "Changelog",
          description: "Release history across all packages",
          url: "/docs/changelog",
        },
        {
          title: "Internal",
          description: "Private APIs for building decorators and composables",
          url: "/docs/internal",
        },
      ]}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
