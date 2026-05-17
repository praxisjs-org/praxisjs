import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDocs } from '../tools/fetch-docs'

function makeFetch(text: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', makeFetch(''))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── format: overview ──────────────────────────────────────────────────────────

describe('fetchDocs — overview', () => {
  it('fetches from /llms.txt', async () => {
    const fetch = makeFetch('# PraxisJS index')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'overview' })

    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0]?.[0]).toBe('https://praxisjs.org/llms.txt')
  })

  it('returns the response body', async () => {
    vi.stubGlobal('fetch', makeFetch('# PraxisJS index'))

    const result = await fetchDocs({ format: 'overview' })

    expect(result).toBe('# PraxisJS index')
  })
})

// ── format: full ──────────────────────────────────────────────────────────────

describe('fetchDocs — full', () => {
  it('fetches from /llms-full.txt', async () => {
    const fetch = makeFetch('full docs')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'full' })

    expect(fetch.mock.calls[0]?.[0]).toBe('https://praxisjs.org/llms-full.txt')
  })

  it('returns the response body', async () => {
    vi.stubGlobal('fetch', makeFetch('full docs content'))

    const result = await fetchDocs({ format: 'full' })

    expect(result).toBe('full docs content')
  })
})

// ── format: page ─────────────────────────────────────────────────────────────

describe('fetchDocs — page', () => {
  it('builds the correct URL for a plain slug', async () => {
    const fetch = makeFetch('# Components')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'page', page: 'essentials/components' })

    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://praxisjs.org/llms.mdx/docs/essentials/components/content.md',
    )
  })

  it('strips a leading slash from the slug', async () => {
    const fetch = makeFetch('# Reactivity')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'page', page: '/essentials/reactivity' })

    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://praxisjs.org/llms.mdx/docs/essentials/reactivity/content.md',
    )
  })

  it('strips a trailing /content.md suffix from the slug', async () => {
    const fetch = makeFetch('# Router')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'page', page: 'ecosystem/router/content.md' })

    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://praxisjs.org/llms.mdx/docs/ecosystem/router/content.md',
    )
  })

  it('returns the response body', async () => {
    vi.stubGlobal('fetch', makeFetch('# Store docs'))

    const result = await fetchDocs({ format: 'page', page: 'ecosystem/store' })

    expect(result).toBe('# Store docs')
  })

  it('throws when page slug is omitted', async () => {
    await expect(fetchDocs({ format: 'page' })).rejects.toThrow(
      'page slug is required',
    )
  })

  it('throws when page slug is an empty string', async () => {
    await expect(fetchDocs({ format: 'page', page: '' })).rejects.toThrow(
      'page slug is required',
    )
  })
})

// ── HTTP errors ───────────────────────────────────────────────────────────────

describe('fetchDocs — HTTP errors', () => {
  it('throws on a 404 response', async () => {
    vi.stubGlobal('fetch', makeFetch('Not Found', 404))

    await expect(fetchDocs({ format: 'overview' })).rejects.toThrow('HTTP 404')
  })

  it('throws on a 500 response', async () => {
    vi.stubGlobal('fetch', makeFetch('Server Error', 500))

    await expect(fetchDocs({ format: 'full' })).rejects.toThrow('HTTP 500')
  })

  it('includes the URL in the error message', async () => {
    vi.stubGlobal('fetch', makeFetch('', 404))

    await expect(fetchDocs({ format: 'overview' })).rejects.toThrow(
      'https://praxisjs.org/llms.txt',
    )
  })
})
