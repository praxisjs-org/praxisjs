import { exit } from "node:process";

import { main } from "./commands/main";

main().catch((e: unknown) => {
  console.error(e);
  exit(1);
});
