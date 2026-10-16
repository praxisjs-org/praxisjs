import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import {
  insideProject,
  isTestFile,
  listSourceFiles,
  readJson,
  resolveProjectRoot,
  stripJsonc,
  toPosix,
} from '../project/files.js'

import { makeProject, removeProjects } from './fixtures.js'

afterEach(removeProjects)

describe('resolveProjectRoot', () => {
  it('prefers PRAXISJS_PROJECT_ROOT, then CLAUDE_PROJECT_DIR, then client roots, then cwd', () => {
    const a = makeProject({ 'package.json': '{}' })
    const b = makeProject({ 'package.json': '{}' })
    const c = makeProject({ 'package.json': '{}' })
    const d = makeProject({ 'package.json': '{}' })
    const roots = [pathToFileURL(c).href]
    expect(resolveProjectRoot({ PRAXISJS_PROJECT_ROOT: a, CLAUDE_PROJECT_DIR: b }, d, roots)).toBe(a)
    expect(resolveProjectRoot({ CLAUDE_PROJECT_DIR: b }, d, roots)).toBe(b)
    expect(resolveProjectRoot({}, d, roots)).toBe(c)
    expect(resolveProjectRoot({ PRAXISJS_PROJECT_ROOT: '', CLAUDE_PROJECT_DIR: '' }, d, roots)).toBe(c)
    expect(resolveProjectRoot({}, d)).toBe(d)
  })

  it('ignores client roots that are not local folders', () => {
    const d = makeProject({ 'package.json': '{}' })
    expect(resolveProjectRoot({}, d, ['https://example.com/repo', 'file://remote-host/share'])).toBe(d)
  })

  it('walks up to the nearest package.json', () => {
    const root = makeProject({ 'package.json': '{}', 'src/deep/file.ts': '' })
    expect(resolveProjectRoot({}, path.join(root, 'src', 'deep'))).toBe(root)
    expect(resolveProjectRoot({ PRAXISJS_PROJECT_ROOT: 'src' }, root)).toBe(root)
  })

  it('returns the starting folder when no package.json exists above it', () => {
    const root = makeProject()
    const fakeRoot = path.join(root, 'nowhere')
    const found = resolveProjectRoot({}, fakeRoot)
    expect(found === fakeRoot || fs.existsSync(path.join(found, 'package.json'))).toBe(true)
    expect(resolveProjectRoot({}, '/')).toBe('/')
  })
})

describe('source files', () => {
  it('lists sorted source files, skipping dependencies, build output, dot-folders and declarations', () => {
    const root = makeProject({
      'src/b.ts': '',
      'src/a.tsx': '',
      'src/c.js': '',
      'src/d.d.ts': '',
      'src/readme.md': '',
      'dist/out.js': '',
      'node_modules/x/index.ts': '',
      '.git/hooks.ts': '',
      'public/sw.js': '',
    })
    expect(listSourceFiles(root)).toEqual(['src/a.tsx', 'src/b.ts', 'src/c.js'])
    expect(listSourceFiles(root, 2)).toEqual(['src/a.tsx', 'src/b.ts'])
  })

  it('returns nothing for a folder it cannot read', () => {
    const root = makeProject({ 'file.ts': '' })
    expect(listSourceFiles(path.join(root, 'file.ts'))).toEqual([])
  })

  it('recognizes test and story files', () => {
    expect(isTestFile('src/__tests__/a.ts')).toBe(true)
    expect(isTestFile('src/a.test.tsx')).toBe(true)
    expect(isTestFile('src/a.spec.ts')).toBe(true)
    expect(isTestFile('src/a.stories.tsx')).toBe(true)
    expect(isTestFile('src/a.ts')).toBe(false)
  })

  it('converts paths to POSIX separators', () => {
    expect(toPosix(['a', 'b', 'c'].join(path.sep))).toBe('a/b/c')
  })
})

describe('insideProject', () => {
  it('resolves paths inside the root', () => {
    expect(insideProject('/p', 'src/a.ts')).toBe(path.resolve('/p/src/a.ts'))
  })

  it('refuses paths that leave the project or are the root itself', () => {
    expect(() => insideProject('/p', '../etc/passwd')).toThrow('outside the project root')
    expect(() => insideProject('/p', '/etc/passwd')).toThrow('outside the project root')
    expect(() => insideProject('/p', '.')).toThrow('outside the project root')
  })
})

describe('JSON with comments', () => {
  it('strips comments and trailing commas but keeps strings intact', () => {
    const text = '{\n  // line\n  "a": "x // not a comment", /* block */ "b": [1, 2,],\n  "c": "q\\"/*",\n}'
    expect(JSON.parse(stripJsonc(text))).toEqual({ a: 'x // not a comment', b: [1, 2], c: 'q"/*' })
    expect(stripJsonc('{"a": 1} /* open')).toBe('{"a": 1} ')
  })

  it('reads objects and rejects anything else', () => {
    const root = makeProject({ 'ok.json': '{ "a": 1, }', 'list.json': '[1]', 'null.json': 'null', 'bad.json': '{' })
    expect(readJson(path.join(root, 'ok.json'))).toEqual({ a: 1 })
    expect(readJson(path.join(root, 'list.json'))).toBeUndefined()
    expect(readJson(path.join(root, 'null.json'))).toBeUndefined()
    expect(readJson(path.join(root, 'bad.json'))).toBeUndefined()
    expect(readJson(path.join(root, 'missing.json'))).toBeUndefined()
  })
})
