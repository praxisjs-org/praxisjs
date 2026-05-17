import { argv, exit } from "node:process";

import { add } from "./commands/add";
import { main } from "./commands/main";

const handler = argv[2] === "add" ? add : main;

handler().catch((e: unknown) => {
  console.error(e);
  exit(1);
});
