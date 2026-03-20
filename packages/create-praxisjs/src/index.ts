import fs from "node:fs";
import path from "node:path";
import { argv, cwd, exit } from "node:process";
import { fileURLToPath } from "node:url";

import {
  cancel,
  confirm,
  intro,
  isCancel,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import pc from "picocolors";

import {
  copy,
  emptyDir,
  formatTargetDir,
  isEmpty,
  pkgManagerFromAgent,
  toValidPackageName,
} from "./utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATES = [
  {
    name: "minimal",
    display: "Minimal",
    description: "Signals, decorators, class components",
  },
  {
    name: "router",
    display: "With Router",
    description: "Minimal + @praxisjs/router for client-side routing",
  },
  {
    name: "full",
    display: "Full",
    description: "Router + store + di + composables + concurrent + devtools",
  },
] as const;

type TemplateName = (typeof TEMPLATES)[number]["name"];

const RENAME_MAP: Record<string, string> = {
  _gitignore: ".gitignore",
};

async function main(): Promise<void> {
  const argTargetDir = formatTargetDir(argv[2] ?? "");

  intro(
    pc.bgCyan(pc.bold(pc.black(" PraxisJS "))) +
      "  " +
      pc.dim("framework scaffolder"),
  );

  let targetDir = argTargetDir;

  if (!targetDir) {
    const projectName = await text({
      message: "Project name:",
      placeholder: "praxisjs-app",
      defaultValue: "praxisjs-app",
    });

    if (isCancel(projectName)) {
      cancel("Operation cancelled");
      exit(0);
    }

    targetDir = formatTargetDir(projectName) || "praxisjs-app";
  }

  if (fs.existsSync(targetDir) && !isEmpty(targetDir)) {
    const overwrite = await confirm({
      message:
        (targetDir === "."
          ? "Current directory"
          : `Target directory "${targetDir}"`) +
        " is not empty. Remove existing files and continue?",
      initialValue: false,
    });

    if (isCancel(overwrite) || !overwrite) {
      cancel("Operation cancelled");
      exit(0);
    }

    emptyDir(targetDir);
  }

  const template = await select<TemplateName>({
    message: "Select a template:",
    options: TEMPLATES.map((t) => ({
      label: t.display,
      hint: t.description,
      value: t.name,
    })),
  });

  if (isCancel(template)) {
    cancel("Operation cancelled");
    exit(0);
  }

  const root = path.join(cwd(), targetDir);

  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }

  const pkgName = toValidPackageName(path.basename(path.resolve(targetDir)));
  const templateDir = path.resolve(__dirname, `../templates/${template}`);

  const writeFile = (file: string, content?: string): void => {
    const destName = RENAME_MAP[file] ?? file;
    const destPath = path.join(root, destName);
    if (content !== undefined) {
      fs.writeFileSync(destPath, content, "utf-8");
    } else {
      copy(path.join(templateDir, file), destPath);
    }
  };

  const s = spinner();
  s.start("Scaffolding project...");

  for (const file of fs
    .readdirSync(templateDir)
    .filter((f) => f !== "_package.json")) {
    writeFile(file);
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, "_package.json"), "utf-8"),
  ) as Record<string, unknown>;
  pkg.name = pkgName;
  writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n");

  s.stop(pc.green("Project scaffolded!"));

  const pkgManager = pkgManagerFromAgent();
  const relPath = path.relative(cwd(), root);
  const displayPath = relPath !== "" ? relPath : ".";

  const installCmd = pkgManager === "yarn" ? "yarn" : `${pkgManager} install`;
  const devCmd = pkgManager === "yarn" ? "yarn dev" : `${pkgManager} run dev`;

  const steps = [
    relPath !== "" ? `cd ${displayPath}` : null,
    installCmd,
    devCmd,
  ]
    .filter(Boolean)
    .map((cmd) => pc.cyan(cmd))
    .join("\n");

  note(steps, "Next steps");

  outro(pc.green("Happy hacking!"));
}

main().catch((e: unknown) => {
  console.error(e);
  exit(1);
});
