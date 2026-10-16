import { praxisjsCSS } from "./css.js";
import { decoratorLoweringPlugin } from "./decorators.js";
import { hmrPlugin, transformHmr } from "./hmr.js";
import { keyedListsPlugin, transformKeyedLists, type KeyedListsPluginOptions } from "./keyed-lists.js";
import { templatesPlugin, transformTemplates, type TemplatesPluginOptions } from "./templates.js";

import type { PluginOption } from "vite";

export { praxisjsCSS };
export { decoratorLoweringPlugin };
export { hmrPlugin, transformHmr };
export { keyedListsPlugin, transformKeyedLists, type KeyedListsPluginOptions };
export { templatesPlugin, transformTemplates, type TemplatesPluginOptions };

export interface PraxisJSVitePluginOptions {
  hmr?: boolean;
  autoImport?: boolean;
  /**
   * Rewrites keyed `{() => list.map((item) => <Row key={…} />)}` into `<For>` so rows are reused
   * instead of rebuilt. `false` turns it off. Default `true`.
   */
  keyedLists?: boolean | KeyedListsPluginOptions;
  /**
   * Compiles JSX trees of host elements into templates cloned with one `cloneNode(true)` per
   * render, binding only their dynamic parts. `false` leaves every element to `jsx()`. Default `true`.
   */
  templates?: boolean | TemplatesPluginOptions;
}

export function praxisjs(options: PraxisJSVitePluginOptions = {}): PluginOption[] {
  const { hmr = true, autoImport = true, keyedLists = true, templates = true } = options;

  return [
    ...(keyedLists === false ? [] : [keyedListsPlugin(keyedLists === true ? {} : keyedLists)]),
    // Before the decorator lowering, which turns class declarations into `let X = (() => …)()`.
    ...(hmr ? [hmrPlugin()] : []),
    decoratorLoweringPlugin(),
    ...(templates === false ? [] : [templatesPlugin(templates === true ? {} : templates)]),
    {
      name: "praxisjs:core",
      enforce: "pre",
      config() {
        return {
          oxc: {
            target: "es2022",
          },
        };
      },
      transform(code, id) {
        if (!autoImport) return;
        if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return;
        if (code.includes("@praxisjs/jsx/jsx-runtime")) return;
        return null;
      },
    },
  ];
}

export default praxisjs;
