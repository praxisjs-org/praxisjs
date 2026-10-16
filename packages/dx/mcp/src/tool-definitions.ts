import { z, type ZodRawShape  } from 'zod'

import { API_KINDS } from './knowledge/api-catalog.js'
import { CATEGORIES, CATEGORY_SPECS, CONVENTION_SCOPES, DECISION_STATUSES, UTILITY_KINDS } from './memory/schema.js'
import { SCAFFOLD_KINDS } from './project/scaffold.js'


export interface ToolDefinition {
  name: string
  description: string
  inputSchema?: ZodRawShape
  annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean }
}

const category = z.enum(CATEGORIES).describe(
  `Memory category: ${CATEGORIES.map((c) => `"${c}" (${CATEGORY_SPECS[c].description})`).join('; ')}`,
)

const ENTRY_FIELDS = `Fields by category (all: title, summary (one line), tags?, related? ["category/id"], id? (kebab-case, derived from the title when omitted)):
- components: location (file path), exports? [names], purpose, api?, usage?, notes?
- utilities: kind (${UTILITY_KINDS.join('|')}), location, exports?, purpose, api?, usage?, notes?
- business-rules: rule, rationale?, examples?, locations? [paths where it is enforced]
- architecture: context, decision, consequences?, status? (${DECISION_STATUSES.join('|')}, default accepted), date? (YYYY-MM-DD, default today), supersedes? [ids]; ids are numbered automatically (0001-…)
- conventions: scope (${CONVENTION_SCOPES.join('|')}), rule, rationale?, examples?, paths? [globs]
- glossary: definition, aliases?`

const library = z
  .enum(['praxisjs', 'morphos', 'kosmesis'])
  .optional()
  .describe('Which documentation: PraxisJS (default), Morphos (headless primitives, @morphos/*) or Kosmesis (copy-paste components).')

const READ_ONLY = { readOnlyHint: true, openWorldHint: false }
const READ_ONLY_WEB = { readOnlyHint: true, openWorldHint: true }

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'praxisjs_overview',
    description:
      'Returns the documentation index of PraxisJS (or Morphos / Kosmesis with `library`). Use it to discover the available pages.',
    inputSchema: { library },
    annotations: READ_ONLY_WEB,
  },
  {
    name: 'praxisjs_get_page',
    description:
      'Returns a specific PraxisJS documentation page as Markdown. Use after praxisjs_overview or praxisjs_search_docs to read the page relevant to the current task. Never guess at decorator options or import paths — always fetch the page first.',
    inputSchema: {
      page: z
        .string()
        .describe(
          'Page slug relative to /docs — e.g. "essentials/components", "essentials/lists", "decorators/performance" (Morphos: "overlays/dialog"; Kosmesis: "components/button"). The "/docs/…" links listed by praxisjs_overview and full URLs are accepted too.',
        ),
      library,
    },
    annotations: READ_ONLY_WEB,
  },
  {
    name: 'praxisjs_full_docs',
    description:
      'Returns a whole documentation site (PraxisJS by default) — all pages concatenated. Large: prefer praxisjs_search_docs, and use this only when cross-topic context is needed.',
    inputSchema: { library },
    annotations: READ_ONLY_WEB,
  },
  {
    name: 'praxisjs_search_docs',
    description:
      'Searches the PraxisJS documentation by topic and returns the best matching sections with their page slug, anchor and a snippet. Use it to find the right page before praxisjs_get_page, and to check whether PraxisJS already covers what you are about to build.',
    inputSchema: {
      query: z.string().min(1).describe('What you are looking for, in words: "debounce an input handler", "highlight the selected row".'),
      limit: z.number().int().min(1).max(20).optional().describe('Maximum results (default 8).'),
      includeChangelog: z.boolean().optional().describe('Also search the changelog pages (default false).'),
      library,
    },
    annotations: READ_ONLY_WEB,
  },
  {
    name: 'praxisjs_api_reference',
    description:
      'Looks up a PraxisJS export by name (decorator, composable, component, function): its package, kind, summary, docs page, the TypeScript signature of the version installed in the project, and the docs section about it. Exports of installed @morphos/* packages are found too.',
    inputSchema: {
      symbol: z.string().min(1).describe('Export name, with or without "@": "Debounce", "@State", "For", "createFieldDecorator".'),
    },
    annotations: READ_ONLY_WEB,
  },
  {
    name: 'praxisjs_list_apis',
    description:
      'Lists the public PraxisJS API by kind and package — decorators, decorator builders, composables, components, base classes, functions — with a one-line summary and docs page each. Pass signatures: true to add the signatures of the installed versions.',
    inputSchema: {
      kind: z.enum(API_KINDS).optional().describe('Only this kind.'),
      package: z.string().optional().describe('Only this package, e.g. "@praxisjs/composables".'),
      signatures: z.boolean().optional().describe('Add the TypeScript signature from the installed package (default false).'),
    },
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_get_install_command',
    description:
      'Returns the correct CLI command to install @praxisjs/* (and @morphos/*) packages without version constraints. Always use this tool to generate install commands — never write version numbers directly into package.json.',
    inputSchema: {
      packages: z
        .array(z.string())
        .min(1)
        .describe('Package names to install: @praxisjs/*, @morphos/*, praxisjs, create-praxisjs or kosmesis, e.g. ["@praxisjs/router", "@morphos/overlays"]'),
      manager: z.enum(['npm', 'pnpm', 'yarn', 'bun']).optional().describe('Package manager to use. Defaults to npm.'),
      dev: z
        .boolean()
        .optional()
        .describe(
          'Install as devDependency. Defaults to true. Pass false for packages the app imports at runtime (core, decorators, jsx, runtime, router, store, …); keep true for build tooling (vite-plugin, ssg, storybook, devtools, mcp).',
        ),
    },
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_inspect_project',
    description:
      'Inspects the project the server runs in by static analysis: installed @praxisjs/* versions, tsconfig problems, AI integrations, pages, components, stores, composables, services, custom decorators, helpers, routes and the folder layout. Use it at the start of a task to know what already exists.',
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_validate_file',
    description:
      'Checks a file (or every source file under a folder) against PraxisJS rules: missing or misplaced @Component, the accessor keyword, decorators on the wrong component type, @State/@Prop not closest to the field, this.props in StatefulComponent, in-place mutation of @State arrays/objects, reactive fields read outside a JSX arrow in render(), decorator arguments naming missing members, internal imports. Run it on every file you create or change.',
    inputSchema: {
      path: z.string().optional().describe('File or folder relative to the project root, e.g. "src/components/user-card.tsx" or "src".'),
      source: z.string().optional().describe('Source text to check instead of a file on disk (with filename).'),
      filename: z.string().optional().describe('Name used for source, e.g. "user-card.tsx" (decides whether JSX is parsed).'),
    },
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_scaffold',
    description:
      'Plans a new file the way this project is organized: the folder it already uses for that kind of file (or the PraxisJS default), a kebab-case file name, starter code with current APIs, a test file when the project writes tests, the docs to read and similar code that may already exist. Writes nothing.',
    inputSchema: {
      kind: z.enum(SCAFFOLD_KINDS).describe('What to create.'),
      name: z.string().min(1).describe('Name of the main export, e.g. "UserCard", "CartStore", "formatPrice".'),
      route: z.string().optional().describe('Pages only: the route path, e.g. "/settings".'),
      stateful: z.boolean().optional().describe('Components only: false for a StatelessComponent (default true).'),
      feature: z.string().optional().describe('Feature-slice projects: the feature it belongs to (leave out for shared code).'),
    },
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_ui_components',
    description:
      "Lists Kosmesis components from the project's registries (the default one and every registry in components.json): name, description, version, npm and registry dependencies, and whether each is installed, outdated or edited locally. Check it before building any UI piece; add components with `npx kosmesis add <name>`.",
    inputSchema: {
      query: z.string().optional().describe('Only components whose name, title or description match these words.'),
      installed: z.boolean().optional().describe('Only components installed in the project.'),
    },
    annotations: READ_ONLY_WEB,
  },
  {
    name: 'praxisjs_memory_init',
    description:
      'Sets up the project memory (.praxis/ at the project root, versioned in git): README, index and a conventions/project-structure entry describing where each kind of file lives. Then reports reusable code not recorded yet. Safe to run again.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'praxisjs_memory_list',
    description: 'Lists project memory entries (title, summary, id), optionally for one category or tag. Also reports unreadable entry files.',
    inputSchema: {
      category: category.optional(),
      tag: z.string().optional().describe('Only entries with this tag.'),
    },
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_memory_get',
    description: 'Returns one project memory entry in full.',
    inputSchema: { category, id: z.string().min(1).describe('Entry id (file name without .md).') },
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_memory_search',
    description:
      'Searches the project memory: reusable components and utilities, business rules, architecture decisions, conventions and glossary. Use it before writing code, to reuse what exists and respect the rules recorded for the project.',
    inputSchema: {
      query: z.string().min(1),
      category: category.optional(),
      limit: z.number().int().min(1).max(50).optional(),
    },
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_memory_check_duplicate',
    description:
      'Answers "is there already something that does X?" before you write it: searches PraxisJS itself (decorators, composables, components), the project memory and the project code, and lists the closest matches.',
    inputSchema: {
      description: z.string().min(1).describe('What the code you are about to write does.'),
      name: z.string().optional().describe('The name you intend to give it.'),
    },
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_memory_add',
    description: `Adds an entry to the project memory. Validated, refused if it contains anything secret-looking, written atomically, index updated.\n${ENTRY_FIELDS}`,
    inputSchema: {
      category,
      entry: z.record(z.unknown()).describe('The entry fields (see the tool description).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'praxisjs_memory_update',
    description: `Changes fields of an existing project memory entry; pass null to clear an optional field. The id cannot change.\n${ENTRY_FIELDS}`,
    inputSchema: {
      category,
      id: z.string().min(1),
      changes: z.record(z.unknown()).describe('Fields to set (null clears an optional field).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'praxisjs_memory_remove',
    description: 'Deletes a project memory entry (for code that was removed, or a rule that no longer holds) and reports entries that referenced it.',
    inputSchema: { category, id: z.string().min(1) },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'praxisjs_memory_upsert',
    description: `Adds or updates many project memory entries at once (the memory bootstrap writes through it). An entry matching an existing one (same id, same location and export, or same title) updates it: lists are merged, and rewriting a reviewed entry's title, summary or any non-empty section is refused with "needs-confirmation" unless confirmRewrite is true. Run with dryRun: true first.\n${ENTRY_FIELDS}`,
    inputSchema: {
      entries: z
        .array(z.object({ category, entry: z.record(z.unknown()) }))
        .min(1)
        .max(200)
        .describe('Entries to add or update.'),
      dryRun: z.boolean().optional().describe('Report what would happen without writing (default false).'),
      confirmRewrite: z.boolean().optional().describe('Allow rewriting existing text, after the user agreed (default false).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'praxisjs_memory_bootstrap_plan',
    description:
      'Plans the first full analysis of the project for the memory: focused passes (UI components, utilities, routes and pages, business rules, architecture, conventions, dependencies and UI libraries, tests and tooling), each with the files to read and the categories it writes, ready to run in parallel with subagents or one after another. Also reports what the memory already has.',
    annotations: READ_ONLY,
  },
  {
    name: 'praxisjs_memory_migrate',
    description:
      'Migrates .praxis/ written in an older format (or by hand) to the current one: re-validates and rewrites every entry canonically, fixes file names, regenerates the index. Dry run by default; with dryRun: false it builds the new memory aside and swaps it in atomically. Invalid entries are reported and kept as they are.',
    inputSchema: {
      dryRun: z.boolean().optional().describe('Only report what would change (default true).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'praxisjs_memory_map',
    description:
      'Maps the codebase against the project memory: reusable components, composables, stores, services, decorators and helpers with no entry yet (with prefilled proposals), and stale entries whose file or export moved or vanished. With record: true it records every proposal (undocumented ones tagged "unreviewed" for you to complete).',
    inputSchema: {
      record: z.boolean().optional().describe('Record the proposals as entries (default false: report only).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
]
