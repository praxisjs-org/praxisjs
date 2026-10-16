import { readFileSync } from 'node:fs'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { RootsListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js'

import { handleCall, type CallContext } from './handle-call.js'
import { resolveProjectRoot } from './project/files.js'
import { TOOL_DEFINITIONS } from './tool-definitions.js'

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string }

const server = new McpServer({ name: 'praxisjs', version })

let clientRoots: string[] = []
const context: CallContext = {
  root: () => resolveProjectRoot(process.env, process.cwd(), clientRoots),
}

for (const tool of TOOL_DEFINITIONS) {
  const config = { description: tool.description, annotations: tool.annotations }
  // Without an input schema the SDK passes only the request context, never arguments.
  if (tool.inputSchema) {
    server.registerTool(tool.name, { ...config, inputSchema: tool.inputSchema }, (args: Record<string, unknown>) =>
      handleCall(tool.name, args, context),
    )
  } else {
    server.registerTool(tool.name, config, () => handleCall(tool.name, {}, context))
  }
}

// Clients that support roots (VS Code, Claude Code…) say which folder is open; it is the fallback
// project root when neither PRAXISJS_PROJECT_ROOT nor CLAUDE_PROJECT_DIR is set.
async function refreshRoots(): Promise<void> {
  if (!server.server.getClientCapabilities()?.roots) return
  try {
    const { roots } = await server.server.listRoots()
    clientRoots = roots.map((root) => root.uri)
  } catch {
    clientRoots = []
  }
}

server.server.oninitialized = () => {
  void refreshRoots()
}
server.server.setNotificationHandler(RootsListChangedNotificationSchema, () => refreshRoots())

const transport = new StdioServerTransport()
await server.connect(transport)
