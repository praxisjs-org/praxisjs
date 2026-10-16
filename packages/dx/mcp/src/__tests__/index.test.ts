import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveProjectRoot } from '../project/files.js'
import { TOOL_DEFINITIONS } from '../tool-definitions.js'

import type { CallContext } from '../handle-call.js'

// ── Hoisted mocks (accessible inside vi.mock factories) ───────────────────────

const { mockRegisterTool, mockConnect, mockHandleCall, mockSetNotificationHandler, lowLevel } = vi.hoisted(() => ({
  mockRegisterTool: vi.fn(),
  mockConnect: vi.fn().mockResolvedValue(undefined),
  mockHandleCall: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
  mockSetNotificationHandler: vi.fn(),
  lowLevel: {
    oninitialized: undefined as (() => void) | undefined,
    getClientCapabilities: vi.fn(),
    listRoots: vi.fn(),
  },
}))

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  // Regular function so it is usable as a constructor with `new`
  McpServer: vi.fn(function McpServer() {
    return {
      registerTool: mockRegisterTool,
      connect: mockConnect,
      server: Object.assign(lowLevel, { setNotificationHandler: mockSetNotificationHandler }),
    }
  }),
}))

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(function StdioServerTransport() {
    return {}
  }),
}))

vi.mock('../handle-call.js', () => ({
  handleCall: mockHandleCall,
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules()
  mockRegisterTool.mockClear()
  mockConnect.mockClear()
  mockHandleCall.mockClear()
  mockSetNotificationHandler.mockClear()
  lowLevel.oninitialized = undefined
  lowLevel.getClientCapabilities.mockReset()
  lowLevel.listRoots.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

async function loadIndex() {
  await import('../index.js')
}

type Callback = (args?: Record<string, unknown>) => Promise<unknown>

function callbackOf(name: string): Callback {
  const call = mockRegisterTool.mock.calls.find((c) => c[0] === name)
  return call?.[2] as Callback
}

function lastContext(): CallContext {
  return mockHandleCall.mock.calls.at(-1)?.[2] as CallContext
}

// ── Server setup ──────────────────────────────────────────────────────────────

describe('mcp index — server setup', () => {
  it('registers every tool definition with its description, schema and annotations', async () => {
    await loadIndex()

    expect(mockRegisterTool.mock.calls.map((c) => c[0])).toEqual(TOOL_DEFINITIONS.map((t) => t.name))
    for (const tool of TOOL_DEFINITIONS) {
      const config = mockRegisterTool.mock.calls.find((c) => c[0] === tool.name)?.[1] as Record<string, unknown>
      expect(config.description).toBe(tool.description)
      expect(config.annotations).toStrictEqual(tool.annotations)
      expect(Object.keys((config.inputSchema ?? {}) as object)).toEqual(Object.keys(tool.inputSchema ?? {}))
    }
  })

  it('reports the package version to clients', async () => {
    const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js')
    const { readFileSync } = await import('node:fs')
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }

    await loadIndex()

    expect(McpServer).toHaveBeenLastCalledWith({ name: 'praxisjs', version: pkg.version })
  })

  it('connects the server to the transport', async () => {
    await loadIndex()

    expect(mockConnect).toHaveBeenCalledOnce()
  })
})

// ── Tool callbacks ────────────────────────────────────────────────────────────

describe('mcp index — tool callbacks', () => {
  it('passes arguments to handleCall for tools with an input schema', async () => {
    await loadIndex()

    await callbackOf('praxisjs_get_page')({ page: 'essentials/components' })

    expect(mockHandleCall).toHaveBeenCalledWith('praxisjs_get_page', { page: 'essentials/components' }, expect.any(Object))
  })

  it('passes no arguments for tools without an input schema, whatever the SDK hands over', async () => {
    await loadIndex()

    await callbackOf('praxisjs_inspect_project')({ signal: 'request context' })

    expect(mockHandleCall).toHaveBeenCalledWith('praxisjs_inspect_project', {}, expect.any(Object))
  })
})

// ── Project root ──────────────────────────────────────────────────────────────

describe('mcp index — project root', () => {
  it('resolves the root from PRAXISJS_PROJECT_ROOT', async () => {
    vi.stubEnv('PRAXISJS_PROJECT_ROOT', '/tmp')
    vi.stubEnv('CLAUDE_PROJECT_DIR', '')
    await loadIndex()
    await callbackOf('praxisjs_inspect_project')()

    expect(lastContext().root()).toBe('/tmp')
  })

  it('uses the roots announced by the client and refreshes them on change', async () => {
    vi.stubEnv('PRAXISJS_PROJECT_ROOT', undefined)
    vi.stubEnv('CLAUDE_PROJECT_DIR', undefined)
    lowLevel.getClientCapabilities.mockReturnValue({ roots: { listChanged: true } })
    lowLevel.listRoots.mockResolvedValueOnce({ roots: [{ uri: 'file:///tmp' }] })
    await loadIndex()

    lowLevel.oninitialized?.()
    await vi.waitFor(() => {
      expect(lowLevel.listRoots).toHaveBeenCalledOnce()
    })
    await callbackOf('praxisjs_inspect_project')()
    expect(lastContext().root()).toBe('/tmp')

    lowLevel.listRoots.mockRejectedValueOnce(new Error('not supported'))
    const onRootsChanged = mockSetNotificationHandler.mock.calls[0][1] as () => Promise<void>
    await onRootsChanged()
    expect(lastContext().root()).toBe(resolveProjectRoot({}, process.cwd()))
    expect(lowLevel.listRoots).toHaveBeenCalledTimes(2)
  })

  it('does not ask clients without roots support', async () => {
    lowLevel.getClientCapabilities.mockReturnValue(undefined)
    await loadIndex()

    lowLevel.oninitialized?.()
    const onRootsChanged = mockSetNotificationHandler.mock.calls[0][1] as () => Promise<void>
    await onRootsChanged()

    expect(lowLevel.listRoots).not.toHaveBeenCalled()
  })
})
