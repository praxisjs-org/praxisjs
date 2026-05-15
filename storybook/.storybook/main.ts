import type { StorybookConfig } from "@praxisjs/storybook";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@praxisjs/storybook",
    options: {},
  },
};

export default config;
