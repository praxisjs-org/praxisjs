#!/usr/bin/env node
/**
 * Ensures create-praxisjs always receives a patch bump whenever any
 * @praxisjs/* package is being bumped.
 *
 * Run automatically as part of `pnpm version-packages`, before `changeset version`.
 * If create-praxisjs is already included in an existing changeset, this is a no-op.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(import.meta.url), '../../')
const changesetDir = join(root, '.changeset')

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
    } else if (pkg.startsWith('@praxisjs/')) {
      hasWorkspaceChanges = true
    }
  }
}

if (!hasWorkspaceChanges || createPraxisAlreadyIncluded) {
  process.exit(0)
}

const filename = join(changesetDir, `auto-create-praxisjs-bump-${Date.now()}.md`)
const content = `---\n"create-praxisjs": patch\n---\n\nBump template dependencies to match updated @praxisjs packages.\n`

writeFileSync(filename, content)
console.log(`Auto-generated changeset for create-praxisjs: ${filename}`)
