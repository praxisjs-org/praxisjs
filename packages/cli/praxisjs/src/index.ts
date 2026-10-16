import { argv, exit } from "node:process";

import { add } from "./commands/ai/add";
import { remove } from "./commands/ai/remove";
import { sync } from "./commands/ai/sync";
import { doctor } from "./commands/doctor";
import { upgrade } from "./commands/upgrade";

const aiCommands: Record<string, () => Promise<void>> = {
  add,
  remove,
  sync,
};

const usage =
  "Usage: praxisjs <command>\n\n" +
  "Commands:\n" +
  "  ai add       Add an AI integration to an existing project\n" +
  "  ai remove    Remove an AI integration from the project\n" +
  "  ai sync      Update installed AI integrations to this version (--dry-run to preview)\n" +
  "  doctor       Diagnose common issues in an existing project\n" +
  "  upgrade      Upgrade @praxisjs/*, @morphos/* and kosmesis to their latest compatible version";

function resolveHandler(): (() => Promise<void>) | undefined {
  const [first, second] = argv.slice(2);

  if (first === "ai") return second ? aiCommands[second] : undefined;
  if (first === "doctor") return doctor;
  if (first === "upgrade") return upgrade;
  return undefined;
}

const handler = resolveHandler();

if (!handler) {
  const commandLabel = argv.slice(2).join(" ");
  const label = commandLabel ? `Unknown command: "${commandLabel}"` : "No command given.";
  console.error(`${label}\n\n${usage}`);
  exit(1);
} else {
  handler().catch((e: unknown) => {
    console.error(e);
    exit(1);
  });
}
