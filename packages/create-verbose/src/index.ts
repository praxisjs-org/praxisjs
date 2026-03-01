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
    description: "Minimal + @verbose/router for client-side routing",
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

function formatTargetDir(targetDir: string): string {
  return targetDir.trim().replace(/\/+$/g, "");
}

function toValidPackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z\d\-~]+/g, "-");
}

function isEmpty(dirPath: string): boolean {
  const files = fs.readdirSync(dirPath);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

function emptyDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file === ".git") continue;
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

function copy(src: string, dest: string): void {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copy(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function pkgManagerFromAgent(): string {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("bun")) return "bun";
  return "npm";
}

async function main(): Promise<void> {
  const argTargetDir = formatTargetDir(argv[2] ?? "");

  intro(pc.bgCyan(pc.bold(pc.black(" Verbose "))) + "  " + pc.dim("framework scaffolder"));

  let targetDir = argTargetDir;

  if (!targetDir) {
    const projectName = await text({
      message: "Project name:",
      placeholder: "verbose-app",
      defaultValue: "verbose-app",
    });

    if (isCancel(projectName)) {
      cancel("Operation cancelled");
      exit(0);
    }

    targetDir = formatTargetDir(projectName) || "verbose-app";
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
