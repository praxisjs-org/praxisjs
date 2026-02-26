import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Verbose",
  description: "Signal-driven frontend framework",
  srcDir: "src",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/packages/core" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Component Anatomy", link: "/guide/component-anatomy" },
        ],
      },
      {
        text: "Foundation",
        items: [
          { text: "Signals & Reactive Primitives", link: "/packages/core" },
          { text: "Component Decorators", link: "/packages/decorators" },
          { text: "JSX Runtime", link: "/packages/jsx" },
          { text: "Rendering Engine", link: "/packages/runtime" },
          { text: "Shared", link: "/packages/shared" },
        ],
      },
      {
        text: "State & Data",
        items: [
          { text: "State Management", link: "/packages/store" },
          { text: "Client-side Router", link: "/packages/router" },
          { text: "Finite State Machines", link: "/packages/fsm" },
        ],
      },
      {
        text: "UI & Effects",
        items: [
          { text: "Animations & Transitions", link: "/packages/motion" },
          { text: "Internationalization", link: "/packages/i18n" },
        ],
      },
      {
        text: "Utilities",
        items: [
          { text: "Dependency Injection", link: "/packages/di" },
          { text: "Concurrency Control", link: "/packages/concurrent" },
          { text: "Composition Utilities", link: "/packages/composables" },
        ],
      },
      {
        text: "Developer Experience",
        items: [
          { text: "Vite Integration", link: "/packages/vite-plugin" },
          { text: "Mocks & Fixtures", link: "/packages/mock" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/MateusGX/verbose" },
    ],
  },
});
