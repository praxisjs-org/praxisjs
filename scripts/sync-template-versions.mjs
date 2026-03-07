#!/usr/bin/env node
/**
 * Reads current @praxisjs/* package versions from the workspace
 * and updates all template _package.json files accordingly.
 *
 * Run automatically via `changeset version` step in CI.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(import.meta.url), '../../')

// Collect workspace package versions
const workspaceDirs = [
  'packages/foundation',
  'packages/features',
  'packages/utils',
  'packages/dx',
]

const versions = {}

for (const dir of workspaceDirs) {
  const abs = join(root, dir)
  for (const entry of readdirSync(abs)) {
    const pkgPath = join(abs, entry, 'package.json')
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      if (pkg.name && pkg.version) {
        versions[pkg.name] = pkg.version
      }
    } catch {
      // not a package dir, skip
    }
  }
}

// Update all template _package.json files
const templatesDir = join(root, 'packages/create-praxisjs/templates')

for (const template of readdirSync(templatesDir)) {
  const templatePath = join(templatesDir, template)
  if (!statSync(templatePath).isDirectory()) continue

  const pkgPath = join(templatePath, '_package.json')
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    continue
  }

  let changed = false

  for (const depField of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pkg[depField]) continue
    for (const [name, current] of Object.entries(pkg[depField])) {
      if (versions[name]) {
        const updated = `^${versions[name]}`
        if (current !== updated) {
          pkg[depField][name] = updated
          changed = true
        }
      }
    }
  }

  if (changed) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    console.log(`Updated ${template}/_package.json`)
  }
}

console.log('Template versions synced.')
