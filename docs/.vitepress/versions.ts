/**
 * PraxisJS package versions used in docs examples (LiveExample template).
 * Auto-updated by scripts/sync-template-versions.mjs on every release.
 */
export const VERSIONS = {
  // Foundation
  '@praxisjs/core':          '^1.4.1',
  '@praxisjs/decorators':    '^0.7.5',
  '@praxisjs/jsx':           '^0.4.1',
  '@praxisjs/runtime':       '^0.2.13',
  '@praxisjs/shared':        '^0.2.0',

  // Ecosystem
  '@praxisjs/router':        '^1.0.9',
  '@praxisjs/store':         '^1.0.8',
  '@praxisjs/di':            '^1.2.4',
  '@praxisjs/motion':        '^1.1.7',
  '@praxisjs/fsm':           '^1.0.8',

  // Utils
  '@praxisjs/composables':   '^1.0.5',
  '@praxisjs/concurrent':    '^1.2.5',

  // DX
  '@praxisjs/devtools':      '^0.2.14',
  '@praxisjs/vite-plugin':   '^0.1.1',

  // Peer deps
  'vite':                  '^7.3.1',
  'typescript':            '^5.9.3',
} as const

export function v(pkg: keyof typeof VERSIONS): string {
  return VERSIONS[pkg].replace('^', '')
}
