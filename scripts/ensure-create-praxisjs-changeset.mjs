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

const files = readdirSync(changesetDir).filter(
  (f) => f.endsWith('.md') && f !== 'README.md',
)

let hasWorkspaceChanges = false
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
    } else if (templateDeps.has(pkg)) {
      hasWorkspaceChanges = true
    }
  }
}

if (!hasWorkspaceChanges || createPraxisAlreadyIncluded) {
  process.exit(0)
}

const filename = join(changesetDir, `auto-create-praxisjs-bump-${Date.now()}.md`)
const content = `---\n"create-praxisjs": patch\n---\n\nBump template dependencies to match updated @praxisjs-org packages.\n`

writeFileSync(filename, content)
console.log(`Auto-generated changeset for create-praxisjs: ${filename}`)
