import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Verbose",
  description: "Signal-driven frontend framework",
  srcDir: "src",
  appearance: true,
  themeConfig: {
    search: {
      provider: "local",
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/packages/core" },
      {
        text: "v0.1.0 beta",
        items: [
          {
            text: "v0.1.0 beta",
            link: "/project-status",
          },
        ],
      },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Project Status", link: "/project-status" },
          { text: "Getting Started", link: "/guide/getting-started" },
          {
            text: "Component Anatomy",
            collapsed: false,
            items: [
              { text: "Class Component", link: "/guide/component-anatomy" },
              {
                text: "Function Component",
                link: "/guide/function-component-anatomy",
              },
            ],
          },
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
        text: "Features",
        items: [
          { text: "Dependency Injection", link: "/packages/di" },
          { text: "Finite State Machines", link: "/packages/fsm" },
          { text: "Animations & Transitions", link: "/packages/motion" },
          { text: "Client-side Router", link: "/packages/router" },
          { text: "State Management", link: "/packages/store" },
        ],
      },
      {
        text: "Utils",
        items: [
          { text: "Composition Utilities", link: "/packages/composables" },
          { text: "Concurrency Control", link: "/packages/concurrent" },
        ],
      },
      {
        text: "DX",
        items: [{ text: "Vite Integration", link: "/packages/vite-plugin" }],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/MateusGX/verbose" },
    ],
    footer: {
      message:
        'Released under the <a href="https://github.com/MateusGX/verbose/blob/main/LICENSE">MIT License</a>.',
      copyright:
        'Copyright © 2025-present <a href="https://github.com/MateusGX">Mateus Martins</a>  — Verbose is experimental software, use at your own risk.',
    },
  },
});
