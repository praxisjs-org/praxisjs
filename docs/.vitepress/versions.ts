/**
 * PraxisJS package versions used in docs examples (LiveExample template).
 * Auto-updated by scripts/sync-template-versions.mjs on every release.
 */
export const VERSIONS = {
  // Foundation
  '@praxisjs/core':          '^1.4.0',
  '@praxisjs/decorators':    '^0.7.4',
  '@praxisjs/jsx':           '^0.4.0',
  '@praxisjs/runtime':       '^0.2.12',
  '@praxisjs/shared':        '^0.2.0',

  // Ecosystem
  '@praxisjs/router':        '^1.0.8',
  '@praxisjs/store':         '^1.0.7',
  '@praxisjs/di':            '^1.2.3',
  '@praxisjs/motion':        '^1.1.6',
  '@praxisjs/fsm':           '^1.0.7',

  // Utils
  '@praxisjs/composables':   '^1.0.4',
  '@praxisjs/concurrent':    '^1.2.4',

  // DX
  '@praxisjs/devtools':      '^0.2.13',
  '@praxisjs/vite-plugin':   '^0.1.1',

  // Peer deps
  'vite':                  '^7.3.1',
  'typescript':            '^5.9.3',
} as const

export function v(pkg: keyof typeof VERSIONS): string {
  return VERSIONS[pkg].replace('^', '')
}
