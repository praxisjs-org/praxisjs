import type { RemarkNpmOptions } from 'fumadocs-core/mdx-plugins';

type Manager = 'pnpm' | 'yarn' | 'bun';

const EXECUTE: Record<Manager, string> = { pnpm: 'pnpm dlx', yarn: 'yarn dlx', bun: 'bunx' };
const INSTALL: Record<Manager, string> = { pnpm: 'pnpm install', yarn: 'yarn', bun: 'bun install' };
const RUN: Record<Manager, string> = { pnpm: 'pnpm', yarn: 'yarn', bun: 'bun run' };

function convertCommand(command: string, manager: Manager): string {
  let match: RegExpExecArray | null;
  if ((match = /^npx (?:-y |--yes )?(.+)$/.exec(command))) return `${EXECUTE[manager]} ${match[1]}`;
  if ((match = /^npm create (\S+?)(?:@latest)?(?: (.+))?$/.exec(command))) {
    // npm needs `--` to pass flags on to the create script, the other package managers forward them as is.
    const args = (match[2] ?? '').split(' ').filter((arg) => arg !== '' && arg !== '--');
    return [`${manager} create`, match[1], ...args].join(' ');
  }
  if (/^npm (?:install|i)$/.test(command)) return INSTALL[manager];
  if ((match = /^npm (?:install|i) (.+)$/.exec(command))) return `${manager} add ${match[1]}`;
  if ((match = /^npm (?:uninstall|remove) (.+)$/.exec(command))) return `${manager} remove ${match[1]}`;
  if ((match = /^npm run (.+)$/.exec(command))) return `${RUN[manager]} ${match[1]}`;
  return command;
}

function convertLines(code: string, manager: Manager): string {
  return code
    .split('\n')
    .map((line) => {
      const [, indent, command, comment] = /^(\s*)(.*?)(\s+#.*)?$/.exec(line) ?? ['', '', line, ''];
      return `${indent}${convertCommand(command, manager)}${comment ?? ''}`;
    })
    .join('\n');
}

/**
 * Turns every ```npm code block into npm / pnpm / yarn / bun tabs, writing the commands the way the
 * rest of the docs do (`pnpm dlx`, `bunx`, `create` without `@latest` or `--`).
 */
export const remarkNpmOptions: RemarkNpmOptions = {
  persist: { id: 'package-manager' },
  packageManagers: [
    { name: 'npm', command: (code) => code },
    { name: 'pnpm', command: (code) => convertLines(code, 'pnpm') },
    { name: 'yarn', command: (code) => convertLines(code, 'yarn') },
    { name: 'bun', command: (code) => convertLines(code, 'bun') },
  ],
};
