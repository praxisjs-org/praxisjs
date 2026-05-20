'use client';

import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';

interface PackageInstallProps {
  pkg: string | string[];
  dev?: boolean;
}

export function PackageInstall({ pkg, dev = false }: PackageInstallProps) {
  const packages = Array.isArray(pkg) ? pkg.join(' ') : pkg;

  const commands: Record<string, string> = {
    npm: `npm install${dev ? ' -D' : ''} ${packages}`,
    pnpm: `pnpm add${dev ? ' -D' : ''} ${packages}`,
    yarn: `yarn add${dev ? ' -D' : ''} ${packages}`,
    bun: `bun add${dev ? ' -d' : ''} ${packages}`,
  };

  return (
    <Tabs items={['npm', 'pnpm', 'yarn', 'bun']}>
      {(Object.entries(commands) as [string, string][]).map(([manager, command]) => (
        <Tab key={manager} value={manager}>
          <DynamicCodeBlock lang="sh" code={command} />
        </Tab>
      ))}
    </Tabs>
  );
}
