/**
 * PraxisJS package versions used in docs examples (LiveExample template).
 * Auto-updated by scripts/sync-template-versions.mjs on every release.
 */
export const VERSIONS = {
  // Foundation
  '@praxisjs/core':          '^1.2.0',
  '@praxisjs/decorators':    '^0.7.2',
  '@praxisjs/jsx':           '^0.3.9',
  '@praxisjs/runtime':       '^0.2.10',
  '@praxisjs/shared':        '^0.2.0',

  // Ecosystem
  '@praxisjs/router':        '^1.0.6',
  '@praxisjs/store':         '^1.0.5',
  '@praxisjs/di':            '^1.2.0',
  '@praxisjs/motion':        '^1.1.4',
  '@praxisjs/fsm':           '^1.0.5',

  // Utils
  '@praxisjs/composables':   '^1.0.2',
  '@praxisjs/concurrent':    '^1.2.2',

  // DX
  '@praxisjs/devtools':      '^0.2.11',
  '@praxisjs/vite-plugin':   '^0.1.1',

  // Peer deps
  'vite':                  '^7.3.1',
  'typescript':            '^5.9.3',
} as const

export function v(pkg: keyof typeof VERSIONS): string {
  return VERSIONS[pkg].replace('^', '')
}
