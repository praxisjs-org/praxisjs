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
import { applyPlugin, notePlugin, PLUGINS, type PluginName } from "praxisjs";

import { RENAME_MAP, TEMPLATES, type TemplateName } from "../constants";
import { copy, emptyDir, formatTargetDir, isEmpty, pkgManagerFromAgent, toValidPackageName } from "../utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function main(): Promise<void> {
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
      return;
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
      return;
    }

    emptyDir(targetDir);
  }

  const templateResult = await select<TemplateName>({
    message: "Select a template:",
    options: TEMPLATES.map((t) => ({
      label: t.display,
      hint: t.description,
      value: t.name,
    })),
  });

  if (isCancel(templateResult)) {
    cancel("Operation cancelled");
    exit(0);
    return;
  }

  const template = templateResult;

  const pluginResult = await select<PluginName>({
    message: "Add an AI integration?",
    options: PLUGINS.map((p) => ({
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

  let templateFiles: string[];
  try {
    templateFiles = fs.readdirSync(templateDir);
  } catch {
    s.stop("Failed.");
    throw new Error(
      `Template directory not found: "${templateDir}". ` +
        `Make sure the "${template}" template exists.`,
    );
  }

  for (const file of templateFiles.filter((f) => f !== "_package.json")) {
    writeFile(file);
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(
      fs.readFileSync(path.join(templateDir, "_package.json"), "utf-8"),
    ) as Record<string, unknown>;
  } catch {
    s.stop("Failed.");
    throw new Error(
      `Failed to parse "_package.json" in template "${template}". ` +
        `Ensure the file exists and contains valid JSON.`,
    );
  }
  pkg.name = pkgName;
  writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n");

  if (plugin !== "none") {
    applyPlugin(plugin, root);
  }

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

  notePlugin(plugin);

  outro(pc.green("Happy hacking!"));
}
