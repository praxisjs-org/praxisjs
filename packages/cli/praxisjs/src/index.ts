import { argv, exit } from "node:process";

import { add } from "./commands/add";

const commands: Record<string, () => Promise<void>> = {
  add,
};

const usage =
  "Usage: praxisjs <command>\n\n" +
  "Commands:\n" +
  "  add    Add an AI integration to an existing project";

const commandName = argv[2];
const handler = commandName ? commands[commandName] : undefined;

if (!handler) {
  const label = commandName ? `Unknown command: "${commandName}"` : "No command given.";
  console.error(`${label}\n\n${usage}`);
  exit(1);
} else {
  handler().catch((e: unknown) => {
    console.error(e);
    exit(1);
  });
}
