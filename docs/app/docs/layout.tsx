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
          url: "/docs",
        },
        {
          title: "Changelog",
          description: "Release history across all packages",
          url: "/docs/changelog",
        },
      ]}
      {...baseOptions()}
    >
      {children}
    </DocsLayout>
  );
}
