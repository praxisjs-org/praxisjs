import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetchDocs = vi.fn()

vi.mock('../tools/fetch-docs.js', () => ({ fetchDocs: mockFetchDocs }))

const { searchDocs, sectionsAbout, splitDocs } = await import('../tools/search-docs.js')

const FULL = `# Documentation (/docs)

Intro to the docs.

# Timing (/docs/decorators/timing)

Rate control for methods.

## \`@Debounce(ms)\` [#debouncems]

Delays method execution until calls settle. Use it for a search input.

\`\`\`md
## Not a heading
\`\`\`

### Options [#options]

The ms argument.

## \`@Throttle(ms)\`

Runs on the leading edge.

# Lists (/docs/essentials/lists)
## \`For\` [#for]

Keyed list rendering, rows updated in place.

# @praxisjs/decorators (/docs/changelog/decorators)

## 1.8.0

Debounce now cleans up on unmount.
`

beforeEach(() => {
  mockFetchDocs.mockReset()
  mockFetchDocs.mockResolvedValue(FULL)
})

describe('splitDocs', () => {
  it('splits pages into sections, ignoring headings inside code fences', () => {
    const sections = splitDocs(FULL)
    expect(sections.map((s) => [s.slug, s.heading, s.anchor])).toEqual([
      ['', 'Documentation', undefined],
      ['decorators/timing', 'Timing', undefined],
      ['decorators/timing', '`@Debounce(ms)`', 'debouncems'],
      ['decorators/timing', 'Options', 'options'],
      ['decorators/timing', '`@Throttle(ms)`', undefined],
      ['essentials/lists', '`For`', 'for'],
      ['changelog/decorators', '1.8.0', undefined],
    ])
    expect(sections[2].text).toContain('## Not a heading')
  })

  it('handles an unterminated fence', () => {
    expect(splitDocs('# P (/docs/p)\n\n```\n## inside\n').map((s) => s.heading)).toEqual(['P'])
  })
})

describe('searchDocs', () => {
  it('ranks sections and leaves changelogs out unless asked', async () => {
    const hits = await searchDocs('debounce search input')
    expect(hits[0]).toMatchObject({ slug: 'decorators/timing', anchor: 'debouncems', snippet: 'Delays method execution until calls settle. Use it for a search input.' })
    expect(hits.some((h) => h.slug.startsWith('changelog'))).toBe(false)
    expect(mockFetchDocs).toHaveBeenCalledWith({ format: 'full' })

    const withChangelog = await searchDocs('cleans up on unmount', { includeChangelog: true, limit: 1 })
    expect(withChangelog).toHaveLength(1)
    expect(withChangelog[0].slug).toBe('changelog/decorators')
    expect(await searchDocs('nothing at all')).toEqual([])
    expect((await searchDocs('debounce method rows')).map((h) => h.heading)).toEqual(['`@Debounce(ms)`', 'Timing', '`For`'])
  })
})

describe('sectionsAbout', () => {
  it('returns the sections of a page whose heading names the symbol', async () => {
    expect((await sectionsAbout('Debounce', 'decorators/timing')).map((s) => s.heading)).toEqual(['`@Debounce(ms)`'])
    expect(await sectionsAbout('Debounce', 'essentials/lists')).toEqual([])
    expect((await sectionsAbout('For', 'essentials/lists')).map((s) => s.anchor)).toEqual(['for'])
  })
})
