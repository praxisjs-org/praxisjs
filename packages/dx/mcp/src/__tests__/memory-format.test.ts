import { describe, expect, it } from 'vitest'

import { MANAGED_HEADER, normalizeText, parseEntry, sectionText, serializeEntry } from '../memory/format.js'
import { ENTRY_SCHEMAS, isCategory, slugify } from '../memory/schema.js'
import { findSecret } from '../memory/secrets.js'

import type { Entry } from '../memory/schema.js'

const component: Entry = {
  category: 'components',
  id: 'user-card',
  fields: {
    title: 'UserCard',
    summary: 'Shows a user: name, avatar #1',
    location: 'src/components/user-card.tsx',
    exports: ['UserCard', 'UserCardProps', 'UserCard'],
    tags: ['ui', 'profile'],
    related: [],
  },
  sections: {
    purpose: '  Displays a user.  \r\n\r\n\r\n\r\nUse it in lists.  ',
    usage: '```tsx\n## not a heading\n<UserCard />\n```\n# Heading\n## Another',
    notes: '   ',
  },
}

describe('serializeEntry / parseEntry', () => {
  it('writes the managed header, fields in a fixed order, sorted lists and normalized sections', () => {
    const text = serializeEntry(component)
    expect(text).toBe(
      [
        '---',
        MANAGED_HEADER,
        'id: user-card',
        'title: UserCard',
        'summary: "Shows a user: name, avatar #1"',
        'location: src/components/user-card.tsx',
        'exports: [UserCard, UserCardProps]',
        'tags: [profile, ui]',
        '---',
        '',
        '## Purpose',
        '',
        'Displays a user.',
        '',
        'Use it in lists.',
        '',
        '## Usage',
        '',
        '```tsx',
        '## not a heading',
        '<UserCard />',
        '```',
        '### Heading',
        '### Another',
        '',
      ].join('\n'),
    )
  })

  it('round-trips and is stable', () => {
    const text = serializeEntry(component)
    const parsed = parseEntry('components', text)
    expect(parsed.id).toBe('user-card')
    expect(parsed.fields).toEqual({
      title: 'UserCard',
      summary: 'Shows a user: name, avatar #1',
      location: 'src/components/user-card.tsx',
      exports: ['UserCard', 'UserCardProps'],
      tags: ['profile', 'ui'],
    })
    expect(serializeEntry(parsed)).toBe(text)
  })

  it('quotes values that are not plain, including list items', () => {
    const entry: Entry = {
      category: 'conventions',
      id: 'x',
      fields: { title: 'Trailing ', summary: 'a', scope: 'code', paths: ['src/**', 'plain', 'with, comma'] },
      sections: { rule: 'r' },
    }
    const text = serializeEntry(entry)
    expect(text).toContain('title: "Trailing "')
    expect(text).toContain('paths: [plain, "src/**", "with, comma"]')
    expect(parseEntry('conventions', text).fields.paths).toEqual(['plain', 'src/**', 'with, comma'])
  })

  it('reads hand-formatted lists and ignores unknown headings', () => {
    const text = '---\r\nid: t\r\ntitle: T\r\nsummary: s\r\naliases: [ a , "b\\"c",, ]\r\nempty: x\r\n\r\n---\n## Definition\n\nWord.\n\n## Unknown\n\nignored\n'
    const parsed = parseEntry('glossary', text)
    expect(parsed.fields.aliases).toEqual(['a', 'b"c'])
    expect(parsed.sections).toEqual({ definition: 'Word.' })
    expect(parseEntry('glossary', '---\nid: t\naliases: []\n---\n').fields.aliases).toEqual([])
  })

  it('rejects files that are not in the managed format', () => {
    expect(() => parseEntry('glossary', 'no frontmatter')).toThrow('missing frontmatter')
    expect(() => parseEntry('glossary', '---\nid: x\n')).toThrow('unterminated frontmatter')
    expect(() => parseEntry('glossary', '---\nnot a field\n---\n')).toThrow('invalid frontmatter line')
    expect(() => parseEntry('glossary', '---\naliases: a\n---\n')).toThrow('"aliases" must be a [list]')
    expect(() => parseEntry('glossary', '---\ntitle: x\n---\n')).toThrow('missing id')
  })

  it('normalizes text', () => {
    expect(normalizeText('a  \r\nb\r\r\n\n\nc ')).toBe('a\nb\n\nc')
    expect(sectionText('# A\n~~~\n# code\n~~~')).toBe('### A\n~~~\n# code\n~~~')
  })
})

describe('schema helpers', () => {
  it('builds ids from titles', () => {
    expect(slugify('UserCard')).toBe('user-card')
    expect(slugify('  Café & Crème: v2!  ')).toBe('cafe-creme-v2')
    expect(slugify(`${'a'.repeat(79)} b`)).toBe('a'.repeat(79))
    expect(slugify('!!!')).toBe('')
  })

  it('knows its categories', () => {
    expect(isCategory('components')).toBe(true)
    expect(isCategory('nope')).toBe(false)
    expect(isCategory(1)).toBe(false)
  })

  it('validates entries strictly', () => {
    const ok = ENTRY_SCHEMAS.utilities.safeParse({ title: 'T', summary: 's', kind: 'store', location: 'src/a.ts', purpose: 'p' })
    expect(ok.success).toBe(true)
    const bad = ENTRY_SCHEMAS.utilities.safeParse({
      title: 'two\nlines',
      summary: 's',
      kind: 'thing',
      location: '../outside.ts',
      purpose: 'p',
      tags: ['Not Kebab'],
      related: ['Bad Ref'],
      extra: 1,
    })
    expect(bad.success).toBe(false)
    expect(ENTRY_SCHEMAS.architecture.parse({ title: 'T', summary: 's', context: 'c', decision: 'd' }).status).toBe('accepted')
    expect(ENTRY_SCHEMAS.architecture.safeParse({ title: 'T', summary: 's', context: 'c', decision: 'd', date: '15/10/2026' }).success).toBe(false)
    expect(ENTRY_SCHEMAS.components.safeParse({ title: 'T', summary: 's', location: '/abs/path.ts', purpose: 'p' }).success).toBe(false)
  })
})

describe('findSecret', () => {
  it('recognizes common credentials', () => {
    const cases: Array<[string, string]> = [
      ['-----BEGIN RSA PRIVATE KEY-----', 'a private key'],
      ['AKIAABCDEFGHIJKLMNOP', 'an AWS access key'],
      [`ghp_${'a'.repeat(36)}`, 'a GitHub token'],
      [`sk-ant-${'a'.repeat(30)}`, 'an API key'],
      [`sk_live_${'a'.repeat(24)}`, 'a Stripe key'],
      ['xoxb-1234567890-abc', 'a Slack token'],
      [`AIza${'a'.repeat(35)}`, 'a Google API key'],
      ['eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4', 'a JSON Web Token'],
      ['postgres://user:hunter2@db.local/app', 'credentials in a URL'],
      ['password = correcthorsebattery', 'a secret assignment'],
    ]
    for (const [value, kind] of cases) expect(findSecret(value)).toBe(kind)
  })

  it('accepts references to where a secret comes from', () => {
    expect(findSecret('The API key is read from import.meta.env.VITE_API_KEY')).toBeUndefined()
    expect(findSecret('apiKey: process.env.API_KEY')).toBeUndefined()
    expect(findSecret('token = ${TOKEN}')).toBeUndefined()
    expect(findSecret('Passwords must be at least 12 characters.')).toBeUndefined()
  })
})
