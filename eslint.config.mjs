// @ts-check
import importX from 'eslint-plugin-import-x'
import unicorn from 'eslint-plugin-unicorn'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // ── Ignores ─────────────────────────────────────────────────────────────────
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', 'docs/**', 'playground/**', 'packages/create-verbose/templates/**'],
  },

  // ── TypeScript source files ──────────────────────────────────────────────────
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.ts', '*.config.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
      'unused-imports': unusedImports,
      unicorn,
    },
    rules: {
      // ── File naming ──────────────────────────────────────────────────────────
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],

      // ── Unused vars & imports ────────────────────────────────────────────────
      // Disabled in favor of the more granular unused-imports plugin
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // ── Import organisation ──────────────────────────────────────────────────
      // All imports must come before other code
      'import-x/first': 'error',
      // Blank line required after the last import
      'import-x/newline-after-import': 'error',
      // No duplicate specifiers from the same module
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],
      // No `import foo from './foo'` where foo is the current file
      'import-x/no-self-import': 'error',
      // Enforce a consistent import order:
      //   1. node built-ins
      //   2. external npm packages
      //   3. @verbose/* workspace packages
      //   4. relative imports (parent → sibling → index)
      //   5. type-only imports last
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'type',
          ],
          pathGroups: [
            {
              pattern: '@verbose/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // ── TypeScript: safety ───────────────────────────────────────────────────
      // Prefer `import type` for type-only imports (tree-shaking friendly)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Prefer `export type` for type-only exports
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      // Prevent `import 'foo'` type imports that trigger side-effects
      '@typescript-eslint/no-import-type-side-effects': 'error',
      // Ban `any` — use `unknown` when the type is truly unknown
      '@typescript-eslint/no-explicit-any': 'error',
      // Ban `!` non-null assertions — handle nullability explicitly
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Disabled: conflicts with no-non-null-assertion (both can't be satisfied simultaneously)
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      // Prefer `??` over `||` for nullish checks
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      // Prefer `a?.b` over `a && a.b`
      '@typescript-eslint/prefer-optional-chain': 'error',
      // Warn on conditions that are always true/false per the type system
      '@typescript-eslint/no-unnecessary-condition': 'error',
      // Promises must be awaited or explicitly handled
      '@typescript-eslint/no-floating-promises': 'error',
      // Only `await` actual Thenables
      '@typescript-eslint/await-thenable': 'error',
      // `async` functions must contain at least one `await`
      '@typescript-eslint/require-await': 'warn',
      // Prevent passing non-Promise values to Promise-accepting APIs
      '@typescript-eslint/no-misused-promises': 'error',
      // Class properties that are never re-assigned should be `readonly`
      '@typescript-eslint/prefer-readonly': 'warn',

      // ── TypeScript: style ────────────────────────────────────────────────────
      // Prefer `interface` for object shapes (extends & merging work better)
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      // Prefer `T[]` for simple types, `Array<T>` for complex ones
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
    },
  },
)
