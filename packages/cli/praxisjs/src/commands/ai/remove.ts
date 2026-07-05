import { cwd, exit } from "node:process";

import { cancel, confirm, intro, isCancel, outro, select, spinner } from "@clack/prompts";
import pc from "picocolors";

import { PLUGINS, type PluginName } from "../../constants";
import { noteRemovedPlugin, removePlugin } from "../../plugins";

export async function remove(): Promise<void> {
  intro(
    pc.bgCyan(pc.bold(pc.black(" PraxisJS "))) +
      "  " +
      pc.dim("remove integration"),
  );

  const pluginResult = await select<PluginName>({
    message: "Which AI integration do you want to remove?",
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

  const confirmed = await confirm({
    message: `Remove the ${PLUGINS.find((p) => p.name === plugin)?.display ?? plugin} integration from this project?`,
    initialValue: false,
  });

  if (isCancel(confirmed) || !confirmed) {
    cancel("Operation cancelled");
    exit(0);
    return;
  }

  const root = cwd();

  const s = spinner();
  s.start("Removing integration...");
  removePlugin(plugin, root);
  s.stop(pc.green("Done!"));

  noteRemovedPlugin(plugin);

  outro(pc.green("Integration removed."));
}
