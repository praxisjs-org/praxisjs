import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Hoisted mocks (accessible inside vi.mock factories) ───────────────────────

const { mockRegisterTool, mockConnect, mockHandleCall } = vi.hoisted(() => ({
  mockRegisterTool: vi.fn(),
  mockConnect: vi.fn().mockResolvedValue(undefined),
  mockHandleCall: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
}))

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  // Regular function so it is usable as a constructor with `new`
  McpServer: vi.fn(function McpServer() {
    return { registerTool: mockRegisterTool, connect: mockConnect }
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
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function loadIndex() {
  await import('../index.js')
}

// ── Server setup ──────────────────────────────────────────────────────────────

describe('mcp index — server setup', () => {
  it('registers exactly four tools', async () => {
    await loadIndex()

    expect(mockRegisterTool).toHaveBeenCalledTimes(4)
  })

  it('registers praxisjs_overview', async () => {
    await loadIndex()

    const names = mockRegisterTool.mock.calls.map((c) => c[0] as string)
    expect(names).toContain('praxisjs_overview')
  })

  it('registers praxisjs_get_page', async () => {
    await loadIndex()

    const names = mockRegisterTool.mock.calls.map((c) => c[0] as string)
    expect(names).toContain('praxisjs_get_page')
  })

  it('registers praxisjs_full_docs', async () => {
    await loadIndex()

    const names = mockRegisterTool.mock.calls.map((c) => c[0] as string)
    expect(names).toContain('praxisjs_full_docs')
  })

  it('registers praxisjs_get_install_command', async () => {
    await loadIndex()

    const names = mockRegisterTool.mock.calls.map((c) => c[0] as string)
    expect(names).toContain('praxisjs_get_install_command')
  })

  it('connects the server to the transport', async () => {
    await loadIndex()

    expect(mockConnect).toHaveBeenCalledOnce()
  })
})

// ── Tool callbacks ────────────────────────────────────────────────────────────

describe('mcp index — tool callbacks', () => {
  it('praxisjs_overview callback delegates to handleCall', async () => {
    await loadIndex()

    const cb = mockRegisterTool.mock.calls.find((c) => c[0] === 'praxisjs_overview')?.[2] as (() => Promise<unknown>) | undefined
    await cb?.()

    expect(mockHandleCall).toHaveBeenCalledWith('praxisjs_overview', {})
  })

  it('praxisjs_full_docs callback delegates to handleCall', async () => {
    await loadIndex()

    const cb = mockRegisterTool.mock.calls.find((c) => c[0] === 'praxisjs_full_docs')?.[2] as (() => Promise<unknown>) | undefined
    await cb?.()

    expect(mockHandleCall).toHaveBeenCalledWith('praxisjs_full_docs', {})
  })

  it('praxisjs_get_page callback passes page to handleCall', async () => {
    await loadIndex()

    const cb = mockRegisterTool.mock.calls.find((c) => c[0] === 'praxisjs_get_page')?.[2] as ((a: { page: string }) => Promise<unknown>) | undefined
    await cb?.({ page: 'essentials/components' })

    expect(mockHandleCall).toHaveBeenCalledWith('praxisjs_get_page', { page: 'essentials/components' })
  })

  it('praxisjs_get_install_command callback passes args to handleCall', async () => {
    await loadIndex()

    const cb = mockRegisterTool.mock.calls.find((c) => c[0] === 'praxisjs_get_install_command')?.[2] as ((a: { packages: string[]; manager?: string; dev?: boolean }) => Promise<unknown>) | undefined
    await cb?.({ packages: ['@praxisjs/router'], manager: 'pnpm', dev: true })

    expect(mockHandleCall).toHaveBeenCalledWith('praxisjs_get_install_command', {
      packages: ['@praxisjs/router'],
      manager: 'pnpm',
      dev: true,
    })
  })
})
