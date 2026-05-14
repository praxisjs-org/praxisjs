/**
 * PraxisJS package versions used in docs examples (LiveExample template).
 * Auto-updated by scripts/sync-template-versions.mjs on every release.
 */
export const VERSIONS = {
  // Foundation
  '@praxisjs/core':          '^1.5.0',
  '@praxisjs/decorators':    '^0.8.0',
  '@praxisjs/jsx':           '^0.4.2',
  '@praxisjs/runtime':       '^0.2.14',
  '@praxisjs/shared':        '^0.2.0',

  // Ecosystem
  '@praxisjs/router':        '^1.0.10',
  '@praxisjs/store':         '^1.0.9',
  '@praxisjs/di':            '^1.2.5',
  '@praxisjs/motion':        '^1.1.8',
  '@praxisjs/fsm':           '^1.0.9',

  // Utils
  '@praxisjs/composables':   '^1.0.6',
  '@praxisjs/concurrent':    '^1.2.6',

  // DX
  '@praxisjs/devtools':      '^0.2.15',
  '@praxisjs/vite-plugin':   '^0.1.1',

  // Peer deps
  'vite':                  '^7.3.1',
  'typescript':            '^5.9.3',
} as const

export function v(pkg: keyof typeof VERSIONS): string {
  return VERSIONS[pkg].replace('^', '')
}
