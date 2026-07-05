import { cwd, exit } from "node:process";

import { cancel, intro, isCancel, outro, select, spinner } from "@clack/prompts";
import pc from "picocolors";

import { PLUGINS, type PluginName } from "../../constants";
import { applyPlugin, notePlugin } from "../../plugins";

export async function add(): Promise<void> {
  intro(
    pc.bgCyan(pc.bold(pc.black(" PraxisJS "))) +
      "  " +
      pc.dim("add integration"),
  );

  const pluginResult = await select<PluginName>({
    message: "Which AI integration do you want to add?",
    options: PLUGINS.filter((p) => p.name !== "none").map((p) => ({
      label: p.display,
      hint: p.description,
      value: p.name,
    })),
  });

  if (isCancel(pluginResult)) {
    cancel("Operation cancelled");
    exit(0);
    return;
  }

  const plugin = pluginResult;
  const root = cwd();

  const s = spinner();
  s.start("Adding integration...");
  applyPlugin(plugin, root);
  s.stop(pc.green("Done!"));

  notePlugin(plugin);

  outro(pc.green("Happy hacking!"));
}
