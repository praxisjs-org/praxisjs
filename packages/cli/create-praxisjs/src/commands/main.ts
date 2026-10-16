import fs from "node:fs";
import path from "node:path";
import { argv, cwd, exit } from "node:process";
import { fileURLToPath } from "node:url";

import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import pc from "picocolors";
import {
  applyPlugin,
  kosmesisInvocation,
  formatInvocation,
  KOSMESIS_STYLE_SYSTEMS,
  notePlugin,
  PLUGINS,
  printAgentPrompt,
  setupKosmesis,
  STARTER_COMPONENTS,
  type KosmesisSetupResult,
  type PluginName,
} from "praxisjs";

import { RENAME_MAP, TEMPLATES, type TemplateName } from "../constants";
import { dlxCommand, runScriptCommand } from "../tauri/patches";
import { addTauri, rustHelp, type AddTauriResult } from "../tauri/setup";
import {
  copy,
  emptyDir,
  type KosmesisChoice,
  formatTargetDir,
  isEmpty,
  parseArgs,
  pkgManagerFromAgent,
  resolveWorkspaceVersions,
  toValidPackageName,
} from "../utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function main(): Promise<void> {
  const args = parseArgs(argv.slice(2));
  const argTargetDir = args.targetDir;

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

  let tauri = args.tauri;
  if (tauri === undefined) {
    const tauriResult = await confirm({
      message: "Desktop app with Tauri v2?",
      initialValue: false,
    });

    if (isCancel(tauriResult)) {
      cancel("Operation cancelled");
      exit(0);
      return;
    }

    tauri = tauriResult;
  }

  let kosmesis = args.kosmesis;
  if (kosmesis === undefined) {
    const kosmesisResult = await select<KosmesisChoice>({
      message: "Add Kosmesis UI components?",
      options: [
        { label: "No", value: false },
        ...KOSMESIS_STYLE_SYSTEMS.map((style) => ({
          label: `Yes, with ${style.display}`,
          hint: style.description,
          value: style.name,
        })),
      ],
    });

    if (isCancel(kosmesisResult)) {
      cancel("Operation cancelled");
      exit(0);
      return;
    }

    kosmesis = kosmesisResult;
  }

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

  s.message("Resolving package versions...");
  try {
    await resolveWorkspaceVersions(pkg);
  } catch (cause) {
    s.stop("Failed.");
    throw cause;
  }

  writeFile("package.json", JSON.stringify(pkg, null, 2) + "\n");

  if (plugin !== "none") {
    applyPlugin(plugin, root);
  }

  const pkgManager = pkgManagerFromAgent();
  const userAgent = process.env.npm_config_user_agent ?? "";

  let tauriSetup: AddTauriResult | undefined;
  if (tauri) {
    s.message("Adding Tauri v2 (downloads the Tauri CLI)");
    tauriSetup = await addTauri({
      root,
      name: pkgName,
      template,
      packageManager: pkgManager,
      userAgent,
    });
  }

  let kosmesisSetup: KosmesisSetupResult | undefined;
  if (kosmesis) {
    s.message("Adding Kosmesis (installs the project's dependencies)");
    kosmesisSetup = await setupKosmesis({
      root,
      packageManager: pkgManager,
      userAgent,
      styleSystem: kosmesis,
      components: STARTER_COMPONENTS,
    });
  }

  s.stop(pc.green("Project scaffolded!"));

  if (tauriSetup?.ok === false) {
    const init = dlxCommand(pkgManager, userAgent, "@tauri-apps/cli@2", ["init"]);
    log.warn(
      [
        "Tauri v2 was not added. The web project is ready to use.",
        tauriSetup.reason,
        `To add it later, run \`${[init.command, ...init.args].join(" ")}\` in the project: https://v2.tauri.app/start/frontend/vite/`,
      ].join("\n"),
    );
  }

  for (const warning of tauriSetup?.ok ? tauriSetup.warnings : []) {
    log.warn(warning);
  }

  if (kosmesisSetup?.ok === false) {
    log.warn(
      [
        "Kosmesis was not added. The project works without it.",
        kosmesisSetup.reason,
        "To add it later, run in the project:",
        ...kosmesisSetup.commands,
      ].join("\n"),
    );
  }

  const relPath = path.relative(cwd(), root);
  const displayPath = relPath !== "" ? relPath : ".";

  const installCmd = pkgManager === "yarn" ? "yarn" : `${pkgManager} install`;

  const steps = [
    relPath !== "" ? `cd ${displayPath}` : null,
    installCmd,
    runScriptCommand(pkgManager, "dev"),
    tauriSetup?.ok ? runScriptCommand(pkgManager, "tauri:dev") : null,
  ]
    .filter(Boolean)
    .map((cmd) => pc.cyan(cmd))
    .join("\n");

  note(steps, "Next steps");

  const rust = tauriSetup?.ok ? rustHelp(tauriSetup.rust, process.platform) : null;
  if (rust !== null) {
    note(rust, "Rust toolchain");
  }

  if (kosmesisSetup?.ok) {
    note(
      [
        `${pc.dim("Components in")} src/components/ui ${pc.dim(`(${kosmesisSetup.components.join(", ")})`)}`,
        `import { Button } from "@/components/ui/button";`,
        `${pc.dim("Add more:")} ${pc.cyan(formatInvocation(kosmesisInvocation(pkgManager, userAgent, ["add", "<component>"])))}`,
        `${pc.dim("Docs:")} kosmesis.praxisjs.org/docs`,
      ].join("\n"),
      "Kosmesis",
    );
  }

  notePlugin(plugin);

  outro(pc.green("Happy hacking!"));
  printAgentPrompt(plugin, "setup");
}
