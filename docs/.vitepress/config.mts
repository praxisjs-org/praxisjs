import { defineConfig } from "vitepress";
import llmstxt, {
  copyOrDownloadAsMarkdownButtons,
} from "vitepress-plugin-llms";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../../packages/foundation/core/package.json") as {
  version: string;
};

export default defineConfig({
  title: "PraxisJS",
  description:
    "Signal-driven frontend framework — fine-grained reactivity, class components, and a complete ecosystem.",
  srcDir: "src",
  appearance: true,
  themeConfig: {
    logo: "/logo.svg",
    version,
    search: {
      provider: "local",
    },
    nav: [
      { text: "Guide", link: "/guide/introduction" },
      { text: "Essentials", link: "/essentials/components" },
      { text: "Ecosystem", link: "/ecosystem/router" },
      { text: "Changelog", link: "/changelog/core" },
      {
        text: `v${version}`,
        items: [
          { text: "Project Status", link: "/guide/project-status" },
          {
            text: "GitHub",
            link: "https://github.com/praxisjs-org/praxisjs",
          },
        ],
      },
    ],

    sidebar: {
      "/changelog/": [
        {
          text: "Foundation",
          items: [
            { text: "@praxisjs/core", link: "/changelog/core" },
            { text: "@praxisjs/decorators", link: "/changelog/decorators" },
            { text: "@praxisjs/runtime", link: "/changelog/runtime" },
          ],
        },
        {
          text: "Features",
          items: [
            { text: "@praxisjs/router", link: "/changelog/router" },
            { text: "@praxisjs/store", link: "/changelog/store" },
            { text: "@praxisjs/di", link: "/changelog/di" },
            { text: "@praxisjs/motion", link: "/changelog/motion" },
            { text: "@praxisjs/fsm", link: "/changelog/fsm" },
          ],
        },
        {
          text: "Utils",
          items: [
            { text: "@praxisjs/composables", link: "/changelog/composables" },
            { text: "@praxisjs/concurrent", link: "/changelog/concurrent" },
          ],
        },
        {
          text: "Tooling",
          items: [
            { text: "@praxisjs/devtools", link: "/changelog/devtools" },
            { text: "@praxisjs/vite-plugin", link: "/changelog/vite-plugin" },
            { text: "create-praxisjs", link: "/changelog/create-praxisjs" },
          ],
        },
      ],

      "/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Quick Start", link: "/guide/getting-started" },
            { text: "Project Status", link: "/guide/project-status" },
          ],
        },
        {
          text: "Extending",
          items: [
            { text: "Creating Decorators", link: "/guide/custom-decorators" },
            { text: "Creating Composables", link: "/guide/custom-composables" },
          ],
        },
        {
          text: "Essentials",
          items: [
            { text: "Components", link: "/essentials/components" },
            { text: "Reactivity & Signals", link: "/essentials/reactivity" },
            { text: "JSX Syntax", link: "/essentials/jsx" },
            { text: "Lifecycle Hooks", link: "/essentials/lifecycle" },
            { text: "Async Data", link: "/essentials/async-data" },
          ],
        },
        {
          text: "Decorators",
          collapsed: false,
          items: [
            { text: "State & Props", link: "/decorators/state" },
            { text: "Watchers", link: "/decorators/watchers" },
            { text: "Events & Slots", link: "/decorators/events" },
            { text: "Performance", link: "/decorators/performance" },
            { text: "Timing", link: "/decorators/timing" },
            { text: "Utilities", link: "/decorators/utilities" },
            { text: "DX Decorators", link: "/decorators/dx" },
          ],
        },
        {
          text: "Ecosystem",
          items: [
            { text: "Router", link: "/ecosystem/router" },
            { text: "Store", link: "/ecosystem/store" },
            { text: "Dependency Injection", link: "/ecosystem/di" },
            { text: "Motion", link: "/ecosystem/motion" },
            { text: "State Machines", link: "/ecosystem/fsm" },
          ],
        },
        {
          text: "Composables",
          items: [
            { text: "DOM Utilities", link: "/composables/dom" },
            { text: "Browser APIs", link: "/composables/browser" },
            { text: "Concurrency", link: "/composables/concurrency" },
          ],
        },
        {
          text: "Tooling",
          items: [
            { text: "Vite Plugin", link: "/tooling/vite-plugin" },
            { text: "DevTools", link: "/tooling/devtools" },
            { text: "DevTools Plugins", link: "/tooling/devtools-plugins" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/praxisjs-org/praxisjs" },
    ],
    footer: {
      message:
        'Released under the <a href="https://github.com/praxisjs-org/praxisjs/blob/main/LICENSE">MIT License</a>.',
      copyright:
        'Copyright © 2026-present <a href="https://github.com/MateusGX">Mateus Martins</a> — PraxisJS is experimental software, use at your own risk.',
    },
  },
  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }]],
  vite: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [llmstxt() as any],
  },
  markdown: {
    config(md) {
      md.use(copyOrDownloadAsMarkdownButtons);
    },
  },
});
