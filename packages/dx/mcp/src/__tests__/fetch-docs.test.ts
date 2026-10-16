import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CACHE_TTL_MS,
  FETCH_TIMEOUT_MS,
  clearDocsCache,
  fetchDocs,
  normalizeSlug,
} from '../tools/fetch-docs'

function makeFetch(text: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
  })
}

beforeEach(() => {
  clearDocsCache()
  vi.stubGlobal('fetch', makeFetch(''))
})

afterEach(() => {
  vi.useRealTimers()
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

  it('accepts the /docs/… links listed by the overview', async () => {
    const fetch = makeFetch('# Components')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'page', page: '/docs/essentials/components' })

    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://praxisjs.org/llms.mdx/docs/essentials/components/content.md',
    )
  })

  it('maps the docs root to its own content.md', async () => {
    const fetch = makeFetch('# Docs')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'page', page: '/docs' })

    expect(fetch.mock.calls[0]?.[0]).toBe('https://praxisjs.org/llms.mdx/docs/content.md')
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

// ── slug normalization ────────────────────────────────────────────────────────

describe('normalizeSlug', () => {
  it.each([
    ['essentials/components', 'essentials/components'],
    ['/essentials/components', 'essentials/components'],
    ['docs/essentials/components', 'essentials/components'],
    ['/docs/essentials/components/', 'essentials/components'],
    ['https://praxisjs.org/docs/essentials/components', 'essentials/components'],
    ['https://praxisjs.org/docs/essentials/lists#map-with-key', 'essentials/lists'],
    ['/docs/decorators/performance?x=1', 'decorators/performance'],
    ['/llms.mdx/docs/ecosystem/router/content.md', 'ecosystem/router'],
    ['essentials/jsx.mdx', 'essentials/jsx'],
    ['essentials/jsx.md', 'essentials/jsx'],
    ['  tooling/ssg  ', 'tooling/ssg'],
    ['/docs', ''],
    ['docs/', ''],
    ['documents/x', 'documents/x'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeSlug(input)).toBe(expected)
  })
})

// ── caching ───────────────────────────────────────────────────────────────────

describe('fetchDocs — caching', () => {
  it('passes a timeout signal to fetch', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    const fetch = makeFetch('x')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'overview' })

    expect(timeout).toHaveBeenCalledWith(FETCH_TIMEOUT_MS)
    expect((fetch.mock.calls[0]?.[1] as { signal: unknown }).signal).toBe(timeout.mock.results[0]?.value)
    timeout.mockRestore()
  })

  it('serves a repeated call from memory', async () => {
    const fetch = makeFetch('full docs')
    vi.stubGlobal('fetch', fetch)

    expect(await fetchDocs({ format: 'full' })).toBe('full docs')
    expect(await fetchDocs({ format: 'full' })).toBe('full docs')

    expect(fetch).toHaveBeenCalledOnce()
  })

  it('shares one request between concurrent calls', async () => {
    const fetch = makeFetch('# Router')
    vi.stubGlobal('fetch', fetch)

    const results = await Promise.all([
      fetchDocs({ format: 'page', page: 'ecosystem/router' }),
      fetchDocs({ format: 'page', page: '/docs/ecosystem/router' }),
    ])

    expect(results).toEqual(['# Router', '# Router'])
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('fetches again once the cached copy expires', async () => {
    vi.useFakeTimers()
    const fetch = makeFetch('index')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'overview' })
    vi.advanceTimersByTime(CACHE_TTL_MS + 1)
    await fetchDocs({ format: 'overview' })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not cache a failure', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('') })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('back') })
    vi.stubGlobal('fetch', fetch)

    await expect(fetchDocs({ format: 'overview' })).rejects.toThrow('HTTP 503')
    expect(await fetchDocs({ format: 'overview' })).toBe('back')
  })

  it('keeps a newer entry when an older request fails after the cache was cleared', async () => {
    let rejectFirst: (reason: Error) => void = () => {}
    const fetch = vi
      .fn()
      .mockReturnValueOnce(new Promise((_, reject) => { rejectFirst = reject }))
      .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('fresh') })
    vi.stubGlobal('fetch', fetch)

    const first = fetchDocs({ format: 'overview' })
    clearDocsCache()
    expect(await fetchDocs({ format: 'overview' })).toBe('fresh')
    rejectFirst(new Error('aborted'))
    await expect(first).rejects.toThrow('aborted')

    expect(await fetchDocs({ format: 'overview' })).toBe('fresh')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('fetchDocs — other libraries', () => {
  it('reads the Morphos and Kosmesis sites, which publish the same routes', async () => {
    const fetch = makeFetch('ok')
    vi.stubGlobal('fetch', fetch)

    await fetchDocs({ format: 'overview', library: 'morphos' })
    await fetchDocs({ format: 'page', page: '/docs/components/button', library: 'kosmesis' })
    await fetchDocs({ format: 'full', library: 'praxisjs' })

    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      'https://morphos.praxisjs.org/llms.txt',
      'https://kosmesis.praxisjs.org/llms.mdx/docs/components/button/content.md',
      'https://praxisjs.org/llms-full.txt',
    ])
  })
})
