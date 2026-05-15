/**
 * PraxisJS package versions used in docs examples (LiveExample template).
 * Auto-updated by scripts/sync-template-versions.mjs on every release.
 */
export const VERSIONS = {
  // Foundation
  '@praxisjs/core':          '^1.5.0',
  '@praxisjs/decorators':    '^1.0.0',
  '@praxisjs/jsx':           '^0.4.4',
  '@praxisjs/runtime':       '^0.2.16',
  '@praxisjs/shared':        '^0.2.0',

  // Ecosystem
  '@praxisjs/router':        '^1.0.12',
  '@praxisjs/store':         '^1.0.11',
  '@praxisjs/di':            '^1.2.7',
  '@praxisjs/motion':        '^1.1.10',
  '@praxisjs/fsm':           '^1.0.11',

  // Utils
  '@praxisjs/composables':   '^1.1.0',
  '@praxisjs/concurrent':    '^1.2.8',

  // DX
  '@praxisjs/devtools':      '^0.2.17',
  '@praxisjs/vite-plugin':   '^0.1.1',
  '@praxisjs/storybook':     '^0.1.0',

  // Peer deps
  'vite':                  '^7.3.1',
  'typescript':            '^5.9.3',
} as const

export function v(pkg: keyof typeof VERSIONS): string {
  return VERSIONS[pkg].replace('^', '')
}
