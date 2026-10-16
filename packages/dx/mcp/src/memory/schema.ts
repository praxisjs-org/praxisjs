import { z } from 'zod'

/**
 * What the project memory (`.praxis/`) holds. Each category is a folder of Markdown files, one entry
 * per file: scalar and list fields go in the frontmatter, longer text in `## Section`s of the body.
 */

export const CATEGORIES = [
  'components',
  'utilities',
  'business-rules',
  'architecture',
  'conventions',
  'glossary',
] as const

export type Category = (typeof CATEGORIES)[number]

export const UTILITY_KINDS = [
  'composable',
  'store',
  'service',
  'decorator',
  'function',
  'class',
  'stylesheet',
  'type',
  'constant',
] as const

export const DECISION_STATUSES = ['proposed', 'accepted', 'superseded', 'deprecated'] as const

export const CONVENTION_SCOPES = ['structure', 'naming', 'code', 'testing', 'styling', 'workflow', 'other'] as const

export interface FieldSpec {
  /** Frontmatter key. */
  key: string
  type: 'string' | 'list'
}

export interface SectionSpec {
  /** Input field name. */
  key: string
  /** `## Heading` in the file. */
  heading: string
  required: boolean
}

export interface CategorySpec {
  /** Singular label used in messages. */
  label: string
  description: string
  fields: FieldSpec[]
  sections: SectionSpec[]
}

/** Frontmatter keys in file order: title and summary, the category's own fields, then tags and links. */
function fields(...own: FieldSpec[]): FieldSpec[] {
  return [
    { key: 'title', type: 'string' },
    { key: 'summary', type: 'string' },
    ...own,
    { key: 'tags', type: 'list' },
    { key: 'related', type: 'list' },
  ]
}

const CODE_SECTIONS: SectionSpec[] = [
  { key: 'purpose', heading: 'Purpose', required: true },
  { key: 'api', heading: 'API', required: false },
  { key: 'usage', heading: 'Usage', required: false },
  { key: 'notes', heading: 'Notes', required: false },
]

export const CATEGORY_SPECS: Record<Category, CategorySpec> = {
  components: {
    label: 'component',
    description: 'Reusable UI components: what they are for, where they live, their props and how to use them.',
    fields: fields({ key: 'location', type: 'string' }, { key: 'exports', type: 'list' }),
    sections: CODE_SECTIONS,
  },
  utilities: {
    label: 'utility',
    description: 'Reusable non-UI code: composables, stores, services, custom decorators, helpers, stylesheets.',
    fields: fields({ key: 'kind', type: 'string' }, { key: 'location', type: 'string' }, { key: 'exports', type: 'list' }),
    sections: CODE_SECTIONS,
  },
  'business-rules': {
    label: 'business rule',
    description: 'Domain rules the code must respect, and where they are enforced.',
    fields: fields({ key: 'locations', type: 'list' }),
    sections: [
      { key: 'rule', heading: 'Rule', required: true },
      { key: 'rationale', heading: 'Rationale', required: false },
      { key: 'examples', heading: 'Examples', required: false },
    ],
  },
  architecture: {
    label: 'architecture decision',
    description: 'Architecture decision records: context, the decision and its consequences.',
    fields: fields({ key: 'status', type: 'string' }, { key: 'date', type: 'string' }, { key: 'supersedes', type: 'list' }),
    sections: [
      { key: 'context', heading: 'Context', required: true },
      { key: 'decision', heading: 'Decision', required: true },
      { key: 'consequences', heading: 'Consequences', required: false },
    ],
  },
  conventions: {
    label: 'convention',
    description: 'How this project organizes files and writes code: folder layout, naming, coding and testing rules.',
    fields: fields({ key: 'scope', type: 'string' }, { key: 'paths', type: 'list' }),
    sections: [
      { key: 'rule', heading: 'Rule', required: true },
      { key: 'rationale', heading: 'Rationale', required: false },
      { key: 'examples', heading: 'Examples', required: false },
    ],
  },
  glossary: {
    label: 'glossary term',
    description: 'Domain vocabulary: what the words used in the code and the UI mean.',
    fields: fields({ key: 'aliases', type: 'list' }),
    sections: [{ key: 'definition', heading: 'Definition', required: true }],
  },
}

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const PATH = /^(?!\/)(?![A-Za-z]:)(?!.*(?:^|\/)\.\.(?:\/|$))[^\0\\]+$/

const oneLine = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(/^[^\r\n]*$/, 'must be a single line')
const text = z.string().trim().min(1).max(8000)
const list = (item: z.ZodType<string>) => z.array(item).max(50)
const path = oneLine(300).regex(PATH, 'must be a path relative to the project root, without ".."')
const ref = oneLine(200).regex(/^(?:[a-z-]+\/)?[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be an entry id, optionally prefixed with its category ("utilities/format-date")')

const common = {
  id: oneLine(80).regex(ID, 'must be kebab-case (a-z, 0-9 and single dashes)').optional(),
  title: oneLine(120),
  summary: oneLine(240),
  tags: list(oneLine(40).regex(ID, 'tags are kebab-case')).optional(),
  related: list(ref).optional(),
}

const code = {
  ...common,
  location: path,
  exports: list(oneLine(120)).optional(),
  purpose: text,
  api: text.optional(),
  usage: text.optional(),
  notes: text.optional(),
}

const rule = {
  rule: text,
  rationale: text.optional(),
  examples: text.optional(),
}

export const ENTRY_SCHEMAS = {
  components: z.object(code).strict(),
  utilities: z.object({ ...code, kind: z.enum(UTILITY_KINDS) }).strict(),
  'business-rules': z.object({ ...common, locations: list(path).optional(), ...rule }).strict(),
  architecture: z
    .object({
      ...common,
      status: z.enum(DECISION_STATUSES).default('accepted'),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
        .optional(),
      supersedes: list(ref).optional(),
      context: text,
      decision: text,
      consequences: text.optional(),
    })
    .strict(),
  conventions: z
    .object({ ...common, scope: z.enum(CONVENTION_SCOPES), paths: list(oneLine(200)).optional(), ...rule })
    .strict(),
  glossary: z.object({ ...common, aliases: list(oneLine(80)).optional(), definition: text }).strict(),
} satisfies Record<Category, z.ZodType>

/** A stored entry: its id plus string and list fields, as read back from disk. */
export interface Entry {
  category: Category
  id: string
  fields: Partial<Record<string, string | string[]>>
  sections: Partial<Record<string, string>>
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
}
