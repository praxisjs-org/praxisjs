import { describe, expect, it } from 'vitest'

import { compareText, score, snippet, terms } from '../knowledge/text.js'

describe('terms', () => {
  it('splits camelCase, drops stopwords and stems', () => {
    expect(terms('Debounce the searchInput for HTMLParser')).toEqual(['debounce', 'search', 'input', 'html', 'parser'])
    expect(terms('loading items boxes matches classes passed is a')).toEqual(['load', 'item', 'box', 'match', 'class', 'pass'])
    expect(terms('sing bed bus ss')).toEqual(['sing', 'bed', 'bus', 'ss'])
  })
})

describe('score', () => {
  it('weights each query term by the best field that contains it', () => {
    const fields = [
      { text: 'Debounce', weight: 4 },
      { text: 'Delays a method until calls settle', weight: 2 },
    ]
    expect(score(terms('debounce method'), fields)).toEqual({ score: 6, coverage: 1 })
    expect(score(terms('debounc throttle'), fields)).toEqual({ score: 4, coverage: 0.5 })
    expect(score(['ab'], [{ text: 'abc', weight: 1 }])).toEqual({ score: 0, coverage: 0 })
  })

  it('returns zero for an empty query', () => {
    expect(score([], [{ text: 'x', weight: 1 }])).toEqual({ score: 0, coverage: 0 })
  })
})

describe('snippet', () => {
  it('picks the line with the most query terms', () => {
    const text = 'First line\n```ts\ncode with debounce\n```\nUse debounce for search input.\n'
    expect(snippet(text, terms('debounce search'))).toBe('Use debounce for search input.')
  })

  it('falls back to the first line and truncates', () => {
    expect(snippet('a'.repeat(300), ['zzz'], 10)).toBe(`${'a'.repeat(9)}…`)
    expect(snippet('', ['x'])).toBe('')
  })
})

describe('compareText', () => {
  it('orders by code unit', () => {
    expect(['b', 'B', 'a', 'a'].sort(compareText)).toEqual(['B', 'a', 'a', 'b'])
  })
})
