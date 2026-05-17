import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { handleCall } from './handle-call.js'

const server = new McpServer({ name: 'praxisjs', version: '0.1.0' })

server.registerTool(
  'praxisjs_overview',
  {
    description:
      'Returns the PraxisJS documentation index. Use this first to discover available docs pages and get a concise overview of all APIs, decorators, and packages.',
  },
  () => handleCall('praxisjs_overview', {}),
)

server.registerTool(
  'praxisjs_get_page',
  {
    description:
      'Returns a specific PraxisJS documentation page as Markdown. Use after praxisjs_overview to fetch the page relevant to the current task. Never guess at decorator options or import paths — always fetch the page first.',
    inputSchema: {
      page: z
        .string()
        .describe(
          'Page slug relative to /docs — e.g. "essentials/components", "decorators/state", "ecosystem/router". Do not include a leading slash.',
        ),
    },
  },
  ({ page }) => handleCall('praxisjs_get_page', { page }),
)

server.registerTool(
  'praxisjs_full_docs',
  {
    description:
      'Returns the complete PraxisJS documentation — all pages concatenated. Use when cross-topic context is needed or the specific page is unknown.',
  },
  () => handleCall('praxisjs_full_docs', {}),
)

server.registerTool(
  'praxisjs_get_install_command',
  {
    description:
      'Returns the correct CLI command to install @praxisjs/* packages without version constraints. Always use this tool to generate install commands — never write version numbers directly into package.json.',
    inputSchema: {
      packages: z
        .array(z.string())
        .min(1)
        .describe('List of @praxisjs/* package names to install, e.g. ["@praxisjs/router", "@praxisjs/store"]'),
      manager: z
        .enum(['npm', 'pnpm', 'yarn', 'bun'])
        .optional()
        .describe('Package manager to use. Defaults to npm.'),
      dev: z
        .boolean()
        .optional()
        .describe('Install as devDependency. Defaults to true.'),
    },
  },
  ({ packages, manager, dev }) =>
    handleCall('praxisjs_get_install_command', { packages, manager, dev }),
)

const transport = new StdioServerTransport()
await server.connect(transport)
