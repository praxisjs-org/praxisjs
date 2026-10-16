import { cwd, exit } from "node:process";

import { cancel, intro, isCancel, log, outro, select, spinner } from "@clack/prompts";
import pc from "picocolors";

import { isInteractive, syncIntegration } from "./sync";
import { hasMcpServer, printAgentPrompt } from "../../agent-prompts";
import { PLUGINS, type PluginName } from "../../constants";
import { applyPlugin, installedIntegrations, notePlugin } from "../../plugins";

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

  if (plugin !== "none" && installedIntegrations(root).includes(plugin)) {
    const hadServer = hasMcpServer(plugin, root);
    await syncIntegration(plugin, root, { dryRun: false, interactive: isInteractive() });
    outro(pc.green("Updated the existing integration."));
    if (!hadServer && hasMcpServer(plugin, root)) printAgentPrompt(plugin, "map");
    return;
  }

  const s = spinner();
  s.start("Adding integration...");
  const warnings = applyPlugin(plugin, root);
  s.stop(pc.green("Done!"));
  for (const warning of warnings) log.warn(warning);

  notePlugin(plugin);

  outro(pc.green("Happy hacking!"));
  printAgentPrompt(plugin, "map");
}
