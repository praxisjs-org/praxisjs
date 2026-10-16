import { praxisjsCSS } from "./css.js";
import { decoratorLoweringPlugin } from "./decorators.js";
import { hmrPlugin, transformHmr } from "./hmr.js";
import { keyedListsPlugin, transformKeyedLists, type KeyedListsPluginOptions } from "./keyed-lists.js";
import { Libraries, librariesPlugin, type LibrariesOption, type LibraryOptions } from "./libraries.js";
import { JSX_FILE, templatesPlugin, transformTemplates, type TemplatesPluginOptions } from "./templates.js";

import type { PluginOption } from "vite";

export { praxisjsCSS };
export { decoratorLoweringPlugin };
export { hmrPlugin, transformHmr };
export { keyedListsPlugin, transformKeyedLists, type KeyedListsPluginOptions };
export { type LibrariesOption, type LibraryOptions };
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
  /**
   * Dependencies compiled like the app's own code. By default, the packages whose package.json has
   * `"praxisjs": { "optimize": true }`. An object opts packages in (`true`, or where their sources
   * are) or out (`false`) by name; `false` compiles no dependency.
   */
  libraries?: boolean | LibrariesOption;
}

export function praxisjs(options: PraxisJSVitePluginOptions = {}): PluginOption[] {
  const { hmr = true, autoImport = true, keyedLists = true, templates = true, libraries = true } = options;
  const registry = libraries === false ? null : new Libraries(libraries === true ? {} : libraries);
  const isLibrary = registry === null ? undefined : (id: string) => registry.isLibraryFile(id);
  const transforms = {
    keyedLists: keyedLists !== false,
    templates: templates === false ? null : (templates === true ? undefined : templates.include) ?? JSX_FILE,
  };

  return [
    ...(keyedLists === false ? [] : [keyedListsPlugin(keyedLists === true ? {} : keyedLists, isLibrary)]),
    // Before the decorator lowering, which turns class declarations into `let X = (() => …)()`.
    ...(hmr ? [hmrPlugin()] : []),
    decoratorLoweringPlugin(isLibrary),
    ...(templates === false ? [] : [templatesPlugin(templates === true ? {} : templates, isLibrary)]),
    // After the transforms that add imports, so the JSX pragma it adds stays the first line.
    ...(registry === null ? [] : [librariesPlugin(registry, transforms)]),
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
