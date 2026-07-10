#!/usr/bin/env node
/**
 * Generates packages/cli/create-praxisjs/templates/* from templates/*.
 *
 * templates/* are real workspace apps (workspace:* deps) that get built,
 * typechecked and tested like any other package in the monorepo, so they
 * can never silently drift from the current framework API.
 *
 * The output directory is build output (gitignored, never edited by hand)
 * — it is what actually ships inside the published create-praxisjs package.
 * @praxisjs/* dependency versions are intentionally left as "workspace:*" in
 * the generated _package.json: create-praxisjs resolves them to the latest
 * published version at scaffold time (see src/utils.ts#resolveWorkspaceVersions),
 * so this script never needs to know or pin a version number.
 *
 * Run as part of create-praxisjs's `build` script.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../../");
const sourceDir = join(root, "templates");
const outputDir = join(root, "packages/cli/create-praxisjs/templates");

const SKIP = new Set(["node_modules", "dist", ".vite", ".turbo"]);

mkdirSync(outputDir, { recursive: true });

for (const name of readdirSync(sourceDir)) {
  const templateSourceDir = join(sourceDir, name);
  if (!statSync(templateSourceDir).isDirectory()) continue

  const templateOutDir = join(outputDir, name);
  rmSync(templateOutDir, { recursive: true, force: true });
  mkdirSync(templateOutDir, { recursive: true });

  cpSync(templateSourceDir, templateOutDir, {
    recursive: true,
    filter: (src) => !SKIP.has(src.split("/").pop() ?? ""),
  });

  // package.json -> _package.json (npm strips top-level "private" packages
  // out of `files`-based tarballs in some tooling; renaming avoids that plus
  // stops it being mistaken for the CLI's own manifest before it's copied).
  const pkgPath = join(templateOutDir, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    delete pkg.private;
    pkg.version = "0.1.0";
    writeFileSync(
      join(templateOutDir, "_package.json"),
      JSON.stringify(pkg, null, 2) + "\n",
    );
    rmSync(pkgPath);
  }

  // .gitignore -> _gitignore (published npm tarballs drop nested .gitignore
  // files; create-praxisjs restores the real name when scaffolding).
  const gitignorePath = join(templateOutDir, ".gitignore");
  if (existsSync(gitignorePath)) {
    cpSync(gitignorePath, join(templateOutDir, "_gitignore"));
    rmSync(gitignorePath);
  }

  console.log(`Generated templates/${name} -> packages/cli/create-praxisjs/templates/${name}`);
}
