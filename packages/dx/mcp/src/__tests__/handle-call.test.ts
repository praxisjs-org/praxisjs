import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFetchDocs = vi.fn()

vi.mock('../tools/fetch-docs.js', () => ({
  fetchDocs: mockFetchDocs,
}))

// ── Import after mock registration ────────────────────────────────────────────

const { handleCall } = await import('../handle-call.js')

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFetchDocs.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── praxisjs_overview ─────────────────────────────────────────────────────────

describe('handleCall — praxisjs_overview', () => {
  it('calls fetchDocs with format "overview"', async () => {
    mockFetchDocs.mockResolvedValue('# PraxisJS')

    await handleCall('praxisjs_overview', {})

    expect(mockFetchDocs).toHaveBeenCalledOnce()
    expect(mockFetchDocs).toHaveBeenCalledWith({ format: 'overview' })
  })

  it('returns a text content item with the fetched text', async () => {
    mockFetchDocs.mockResolvedValue('# PraxisJS overview')

    const result = await handleCall('praxisjs_overview', {})

    expect(result.content).toEqual([{ type: 'text', text: '# PraxisJS overview' }])
    expect(result.isError).toBeUndefined()
  })
})

// ── praxisjs_full_docs ────────────────────────────────────────────────────────

describe('handleCall — praxisjs_full_docs', () => {
  it('calls fetchDocs with format "full"', async () => {
    mockFetchDocs.mockResolvedValue('full content')

    await handleCall('praxisjs_full_docs', {})

    expect(mockFetchDocs).toHaveBeenCalledWith({ format: 'full' })
  })

  it('returns a text content item with the fetched text', async () => {
    mockFetchDocs.mockResolvedValue('complete docs')

    const result = await handleCall('praxisjs_full_docs', {})

    expect(result.content).toEqual([{ type: 'text', text: 'complete docs' }])
  })
})

// ── praxisjs_get_page ─────────────────────────────────────────────────────────

describe('handleCall — praxisjs_get_page', () => {
  it('calls fetchDocs with format "page" and the given slug', async () => {
    mockFetchDocs.mockResolvedValue('# Components')

    await handleCall('praxisjs_get_page', { page: 'essentials/components' })

    expect(mockFetchDocs).toHaveBeenCalledWith({
      format: 'page',
      page: 'essentials/components',
    })
  })

  it('returns a text content item with the fetched page', async () => {
    mockFetchDocs.mockResolvedValue('# Router docs')

    const result = await handleCall('praxisjs_get_page', { page: 'ecosystem/router' })

    expect(result.content).toEqual([{ type: 'text', text: '# Router docs' }])
    expect(result.isError).toBeUndefined()
  })

  it('returns isError when page arg is missing', async () => {
    const result = await handleCall('praxisjs_get_page', {})

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('"page"')
    expect(mockFetchDocs).not.toHaveBeenCalled()
  })

  it('returns isError when page arg is an empty string', async () => {
    const result = await handleCall('praxisjs_get_page', { page: '' })

    expect(result.isError).toBe(true)
    expect(mockFetchDocs).not.toHaveBeenCalled()
  })

  it('returns isError when page arg is not a string', async () => {
    const result = await handleCall('praxisjs_get_page', { page: 42 })

    expect(result.isError).toBe(true)
    expect(mockFetchDocs).not.toHaveBeenCalled()
  })
})

// ── unknown tool ──────────────────────────────────────────────────────────────

describe('handleCall — unknown tool', () => {
  it('returns isError with the tool name in the message', async () => {
    const result = await handleCall('praxisjs_nonexistent', {})

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('praxisjs_nonexistent')
  })

  it('does not call fetchDocs', async () => {
    await handleCall('praxisjs_nonexistent', {})

    expect(mockFetchDocs).not.toHaveBeenCalled()
  })
})

// ── fetchDocs errors ──────────────────────────────────────────────────────────

describe('handleCall — fetchDocs throws', () => {
  it('catches the error and returns isError', async () => {
    mockFetchDocs.mockRejectedValue(new Error('HTTP 404'))

    const result = await handleCall('praxisjs_overview', {})

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('HTTP 404')
  })

  it('handles non-Error throws as strings', async () => {
    mockFetchDocs.mockRejectedValue('network failure')

    const result = await handleCall('praxisjs_full_docs', {})

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('network failure')
  })
})

// ── praxisjs_get_install_command ───────────────────────────────────────────────

describe('handleCall — praxisjs_get_install_command', () => {
  it('returns npm install command by default', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/router'],
    })

    expect(result.isError).toBeUndefined()
    expect(result.content[0]?.text).toBe('npm install -D @praxisjs/router')
  })

  it('returns pnpm add command when manager is pnpm', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/store', '@praxisjs/di'],
      manager: 'pnpm',
    })

    expect(result.content[0]?.text).toBe('pnpm add -D @praxisjs/store @praxisjs/di')
  })

  it('returns yarn add command when manager is yarn', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/motion'],
      manager: 'yarn',
    })

    expect(result.content[0]?.text).toBe('yarn add -D @praxisjs/motion')
  })

  it('omits -D flag for yarn when dev is false', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/motion'],
      manager: 'yarn',
      dev: false,
    })

    expect(result.content[0]?.text).toBe('yarn add @praxisjs/motion')
  })

  it('returns bun add command when manager is bun', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/composables'],
      manager: 'bun',
    })

    expect(result.content[0]?.text).toBe('bun add -d @praxisjs/composables')
  })

  it('omits -d flag for bun when dev is false', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/composables'],
      manager: 'bun',
      dev: false,
    })

    expect(result.content[0]?.text).toBe('bun add @praxisjs/composables')
  })

  it('omits -D flag when dev is false', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/core'],
      manager: 'pnpm',
      dev: false,
    })

    expect(result.content[0]?.text).toBe('pnpm add @praxisjs/core')
  })

  it('returns isError when packages is empty', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: [],
    })

    expect(result.isError).toBe(true)
  })

  it('returns isError when packages is missing', async () => {
    const result = await handleCall('praxisjs_get_install_command', {})

    expect(result.isError).toBe(true)
  })

  it('returns isError for non-praxisjs packages', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['react'],
    })

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toContain('react')
  })

  it('omits -D flag for npm when dev is false', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/core'],
      manager: 'npm',
      dev: false,
    })

    expect(result.content[0]?.text).toBe('npm install @praxisjs/core')
  })

  it('allows create-praxisjs as a valid package', async () => {
    const result = await handleCall('praxisjs_get_install_command', {
      packages: ['create-praxisjs'],
      manager: 'pnpm',
      dev: false,
    })

    expect(result.isError).toBeUndefined()
    expect(result.content[0]?.text).toBe('pnpm add create-praxisjs')
  })

  it('does not call fetchDocs', async () => {
    await handleCall('praxisjs_get_install_command', {
      packages: ['@praxisjs/router'],
    })

    expect(mockFetchDocs).not.toHaveBeenCalled()
  })
})
