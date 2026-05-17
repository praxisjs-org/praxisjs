import { fetchDocs } from './tools/fetch-docs.js'

export interface TextResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: true
  [key: string]: unknown
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

function buildInstallCommand(
  packages: string[],
  manager: PackageManager,
  dev: boolean,
): string {
  const pkgList = packages.join(' ')
  switch (manager) {
    case 'pnpm':
      return `pnpm add${dev ? ' -D' : ''} ${pkgList}`
    case 'yarn':
      return `yarn add${dev ? ' -D' : ''} ${pkgList}`
    case 'bun':
      return `bun add${dev ? ' -d' : ''} ${pkgList}`
    default:
      return `npm install${dev ? ' -D' : ''} ${pkgList}`
  }
}

export async function handleCall(
  name: string,
  args: Record<string, unknown>,
): Promise<TextResult> {
  try {
    switch (name) {
      case 'praxisjs_overview': {
        const text = await fetchDocs({ format: 'overview' })
        return { content: [{ type: 'text', text }] }
      }

      case 'praxisjs_full_docs': {
        const text = await fetchDocs({ format: 'full' })
        return { content: [{ type: 'text', text }] }
      }

      case 'praxisjs_get_page': {
        const page = args.page
        if (typeof page !== 'string' || !page) {
          return {
            content: [{ type: 'text', text: 'Error: "page" argument is required.' }],
            isError: true,
          }
        }
        const text = await fetchDocs({ format: 'page', page })
        return { content: [{ type: 'text', text }] }
      }

      case 'praxisjs_get_install_command': {
        const raw = args.packages
        if (!Array.isArray(raw) || raw.length === 0) {
          return {
            content: [{ type: 'text', text: 'Error: "packages" must be a non-empty array.' }],
            isError: true,
          }
        }

        const packages = raw.map(String)
        const invalid = packages.filter(
          (p) => !p.startsWith('@praxisjs/') && p !== 'create-praxisjs',
        )
        if (invalid.length > 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: only @praxisjs/* packages are accepted. Invalid: ${invalid.join(', ')}`,
              },
            ],
            isError: true,
          }
        }

        const manager = (args.manager as PackageManager | undefined) ?? 'npm'
        const dev = args.dev !== false

        const command = buildInstallCommand(packages, manager, dev)
        return { content: [{ type: 'text', text: command }] }
      }

      default: {
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    }
  }
}
