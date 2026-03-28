/**
 * PraxisJS package versions used in docs examples (LiveExample template).
 * Auto-updated by scripts/sync-template-versions.mjs on every release.
 */
export const VERSIONS = {
  // Foundation
  '@praxisjs/core':          '^0.4.2',
  '@praxisjs/decorators':    '^0.4.3',
  '@praxisjs/jsx':           '^0.3.3',
  '@praxisjs/runtime':       '^0.2.4',
  '@praxisjs/shared':        '^0.2.0',

  // Ecosystem
  '@praxisjs/router':        '^0.2.5',
  '@praxisjs/store':         '^0.2.3',
  '@praxisjs/di':            '^0.2.3',
  '@praxisjs/motion':        '^0.2.3',
  '@praxisjs/fsm':           '^0.2.3',

  // Utils
  '@praxisjs/composables':   '^0.1.5',
  '@praxisjs/concurrent':    '^0.2.3',

  // DX
  '@praxisjs/devtools':      '^0.2.5',
  '@praxisjs/vite-plugin':   '^0.1.0',

  // Peer deps
  'vite':                  '^7.3.1',
  'typescript':            '^5.9.3',
} as const
