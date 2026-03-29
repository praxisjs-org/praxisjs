/**
 * PraxisJS package versions used in docs examples (LiveExample template).
 * Auto-updated by scripts/sync-template-versions.mjs on every release.
 */
export const VERSIONS = {
  // Foundation
  '@praxisjs/core':          '^1.1.0',
  '@praxisjs/decorators':    '^0.6.1',
  '@praxisjs/jsx':           '^0.3.6',
  '@praxisjs/runtime':       '^0.2.7',
  '@praxisjs/shared':        '^0.2.0',

  // Ecosystem
  '@praxisjs/router':        '^1.0.3',
  '@praxisjs/store':         '^1.0.2',
  '@praxisjs/di':            '^1.1.1',
  '@praxisjs/motion':        '^1.1.1',
  '@praxisjs/fsm':           '^1.0.2',

  // Utils
  '@praxisjs/composables':   '^1.0.1',
  '@praxisjs/concurrent':    '^1.1.1',

  // DX
  '@praxisjs/devtools':      '^0.2.8',
  '@praxisjs/vite-plugin':   '^0.1.0',

  // Peer deps
  'vite':                  '^7.3.1',
  'typescript':            '^5.9.3',
} as const
