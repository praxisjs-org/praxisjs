#!/usr/bin/env node
/**
 * Ensures create-praxisjs always receives a patch bump whenever a
 * @praxisjs/* package it templates depends on is being bumped.
 *
 * Run automatically as part of `pnpm version-packages`, before `changeset version`.
 * If create-praxisjs is already included in an existing changeset, this is a no-op.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(import.meta.url), '../../')
const changesetDir = join(root, '.changeset')

// Only packages actually referenced by a template's _package.json warrant a
// create-praxisjs bump — e.g. @praxisjs/storybook and @praxisjs/mcp are dev
// tooling that scaffolded projects never depend on.
const templatesDir = join(root, 'packages/cli/create-praxisjs/templates')
const templateDeps = new Set()

for (const template of readdirSync(templatesDir)) {
  const pkgPath = join(templatesDir, template, '_package.json')
  if (!statSync(pkgPath, { throwIfNoEntry: false })?.isFile()) continue

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const name of Object.keys(pkg[depField] ?? {})) {
      templateDeps.add(name)
    }
  }
}

// A changeset naming a package X also bumps every package that depends on X
// via "workspace:*" — changesets does this itself (updateInternalDependencies)
// without ever writing X's dependents into a changeset file. So detecting
// "does a template dep change" from changeset frontmatter alone misses e.g.
// @praxisjs/vite-plugin bumping because its @praxisjs/css dependency got a
// changeset. Walk the workspace dependency graph to catch those too.
const workspaceDirs = [
  'packages/foundation',
  'packages/features',
  'packages/utils',
  'packages/dx',
  'packages/cli',
]

// dependents.get(name) = packages that depend on `name` via workspace:*
const dependents = new Map()

for (const dir of workspaceDirs) {
  const abs = join(root, dir)
  for (const entry of readdirSync(abs)) {
    const pkgPath = join(abs, entry, 'package.json')
    let pkg
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    } catch {
      continue
    }
    if (!pkg.name) continue

    for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const [depName, depRange] of Object.entries(pkg[depField] ?? {})) {
        if (!depRange.startsWith('workspace:')) continue
        if (!dependents.has(depName)) dependents.set(depName, new Set())
        dependents.get(depName).add(pkg.name)
      }
    }
  }
}

function withTransitiveDependents(names) {
  const result = new Set(names)
  const queue = [...names]
  while (queue.length) {
    for (const dependent of dependents.get(queue.pop()) ?? []) {
      if (!result.has(dependent)) {
        result.add(dependent)
        queue.push(dependent)
      }
    }
  }
  return result
}

const files = readdirSync(changesetDir).filter(
  (f) => f.endsWith('.md') && f !== 'README.md',
)

const changedPackages = new Set()
let createPraxisAlreadyIncluded = false

for (const file of files) {
  const content = readFileSync(join(changesetDir, file), 'utf8')

  // Extract frontmatter between the first pair of --- delimiters
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) continue

  const frontmatter = match[1]

  for (const line of frontmatter.split('\n')) {
    const pkg = line.match(/^"([^"]+)":/)?.[1]
    if (!pkg) continue

    if (pkg === 'create-praxisjs') {
      createPraxisAlreadyIncluded = true
    } else {
      changedPackages.add(pkg)
    }
  }
}

const allChanged = withTransitiveDependents(changedPackages)
const hasWorkspaceChanges = [...allChanged].some((name) => templateDeps.has(name))

if (!hasWorkspaceChanges || createPraxisAlreadyIncluded) {
  process.exit(0)
}

const filename = join(changesetDir, `auto-create-praxisjs-bump-${Date.now()}.md`)
const content = `---\n"create-praxisjs": patch\n---\n\nBump template dependencies to match updated @praxisjs-org packages.\n`

writeFileSync(filename, content)
console.log(`Auto-generated changeset for create-praxisjs: ${filename}`)
