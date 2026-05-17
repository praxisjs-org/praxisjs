const BASE = 'https://praxisjs.org'

export type DocsFormat = 'overview' | 'full' | 'page'

export interface FetchDocsInput {
  format: DocsFormat
  /** Only used when format is "page". Slug relative to /docs, e.g. "essentials/components" */
  page?: string
}

export async function fetchDocs(input: FetchDocsInput): Promise<string> {
  let url: string

  switch (input.format) {
    case 'overview': {
      url = `${BASE}/llms.txt`
      break
    }
    case 'full': {
      url = `${BASE}/llms-full.txt`
      break
    }
    case 'page': {
      if (!input.page) throw new Error('page slug is required when format is "page"')
      const slug = input.page.replace(/^\//, '').replace(/\/content\.md$/, '')
      url = `${BASE}/llms.mdx/docs/${slug}/content.md`
      break
    }
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${String(response.status)}`)
  }

  return response.text()
}
