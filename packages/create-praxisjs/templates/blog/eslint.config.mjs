// @ts-check
import { defineConfig } from 'eslint/config'
import unicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    },
  },
])
