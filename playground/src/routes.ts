import { Lazy } from "@praxisjs/router";
import { collectionStaticPaths } from "@praxisjs/content";
import type { RouteEntry } from "@praxisjs/ssg";

import { Home } from "./pages/home";
import About from "./pages/about";
import SyncedPage from "./pages/synced";
import DeepStatePage from "./pages/deep-state";
import PerformancePage from "./pages/performance";
import ComputedPage from "./pages/computed";
import { BlogPost } from "./content/blog";

// Shared with @Router([...]) in app.tsx — @praxisjs/ssg reads this same table
// off root's named `routes` export, since it can't read it back out of a
// decorated class at build time.
export const routes: RouteEntry[] = [
  Home,
  About,
  SyncedPage,
  DeepStatePage,
  PerformancePage,
  ComputedPage,
  { path: "/blog", component: Lazy(() => import("./pages/blog")) },
  {
    path: "/blog/:slug",
    component: Lazy(() => import("./pages/post")),
    getStaticPaths: collectionStaticPaths(BlogPost),
  },
];
