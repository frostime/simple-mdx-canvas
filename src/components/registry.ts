import { z } from 'zod'
import path from 'node:path'
import { existsSync } from 'node:fs'
import type { CanvasConfig, CanvasComponentManifest, CanvasRegistry } from '../contracts.js'
import { loadExtensionModule } from '../extensions/load-module.js'
import {
  Chart,
  Columns,
  Column,
  Callout,
  Cards,
  Card,
  Tabs,
  Tab,
  Figure,
  PromptBox,
  HtmlBlock,
  Table,
  Tags,
  Tag,
  Grid,
  Cell,
} from './built-ins/index.js'

const jsonArrayString = z.string().refine((value) => {
  try {
    return Array.isArray(JSON.parse(value))
  } catch {
    return false
  }
}, 'must be a JSON array string')

const jsonObjectString = z.string().refine((value) => {
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}, 'must be a JSON object string')

export const builtInManifests: CanvasComponentManifest<any>[] = [
  {
    name: 'Chart',
    description: 'Render a Chart.js chart from an inline Chart.js configuration object, or from a frontmatter data source via from.',
    component: Chart,
    schema: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      config: z.union([jsonObjectString, z.record(z.unknown())]).optional(),
      from: z.string().optional(),
    }).refine((v) => Boolean(v.config) || Boolean(v.from), {
      message: 'Chart requires either config or from.',
      path: ['config'],
    }),
    allowMarkdownChildren: false,
    dataProp: 'config',
    examples: [
      `<Chart config='{ "type": "bar", "data": { "labels": ["A"], "datasets": [{ "label": "Value", "data": [3] }] } }' />`,
      `<Chart from="costCfg" />`,
    ],
  },
  {
    name: 'Columns',
    description: 'Render multiple Markdown columns.',
    component: Columns,
    schema: z.object({}),
    allowMarkdownChildren: true,
  },
  {
    name: 'Column',
    description: 'A child column for Columns.',
    component: Column,
    schema: z.object({ title: z.string().optional() }),
    allowMarkdownChildren: true,
  },
  {
    name: 'Callout',
    description: 'Render a note, tip, warning, danger, definition, or summary block.',
    component: Callout,
    schema: z.object({
      type: z.enum(['note', 'tip', 'warning', 'danger', 'definition', 'summary']).optional(),
      title: z.string().optional(),
    }),
    allowMarkdownChildren: true,
  },
  {
    name: 'Cards',
    description: 'Container for Card components.',
    component: Cards,
    schema: z.object({}),
    allowMarkdownChildren: true,
  },
  {
    name: 'Card',
    description: 'Render a card with optional title.',
    component: Card,
    schema: z.object({ title: z.string().optional() }),
    allowMarkdownChildren: true,
  },
  {
    name: 'Tabs',
    description: 'Container for Tab blocks. Rendered as stacked sections in static output.',
    component: Tabs,
    schema: z.object({}),
    allowMarkdownChildren: true,
  },
  {
    name: 'Tab',
    description: 'A child tab section.',
    component: Tab,
    schema: z.object({ title: z.string() }),
    allowMarkdownChildren: true,
  },
  {
    name: 'Figure',
    description: 'Render an image with caption and source.',
    component: Figure,
    schema: z.object({
      src: z.string(),
      alt: z.string().optional(),
      caption: z.string().optional(),
      source: z.string().optional(),
    }),
    allowMarkdownChildren: false,
  },

  {
    name: 'Table',
    description: 'Render a Bulma table from JSON rows, or from a frontmatter data source via from.',
    component: Table,
    schema: z.object({
      data: z.union([jsonArrayString, z.array(z.record(z.unknown()))]).optional(),
      from: z.string().optional(),
      columns: z.union([
        z.string(),
        z.array(z.union([
          z.string(),
          z.object({
            key: z.string(),
            label: z.string().optional(),
            align: z.enum(['left', 'center', 'right']).optional(),
          }),
        ])),
      ]).optional(),
      striped: z.boolean().optional(),
      bordered: z.boolean().optional(),
      narrow: z.boolean().optional(),
      hoverable: z.boolean().optional(),
      fullwidth: z.boolean().optional(),
    }).refine((v) => Boolean(v.data) || Boolean(v.from), {
      message: 'Table requires either data or from.',
      path: ['data'],
    }),
    allowMarkdownChildren: false,
    dataProp: 'data',
    examples: [
      `<Table columns='["name","status"]' data='[{"name":"Build","status":"pass"}]' />`,
      `<Table from="rows" columns='["name","status"]' />`,
    ],
  },
  {
    name: 'Tags',
    description: 'Render a Bulma tags container.',
    component: Tags,
    schema: z.object({}),
    allowMarkdownChildren: true,
  },
  {
    name: 'Tag',
    description: 'Render a Bulma tag.',
    component: Tag,
    schema: z.object({
      color: z.enum(['black', 'dark', 'light', 'white', 'primary', 'link', 'info', 'success', 'warning', 'danger']).optional(),
      size: z.enum(['normal', 'medium', 'large']).optional(),
      rounded: z.boolean().optional(),
      light: z.boolean().optional(),
    }),
    allowMarkdownChildren: true,
    examples: [`<Tag color="success" light>Ready</Tag>`],
  },
  {
    name: 'Grid',
    description: 'Render a Bulma fixed-grid container.',
    component: Grid,
    schema: z.object({ columns: z.coerce.number().int().min(1).max(12).optional() }),
    allowMarkdownChildren: true,
  },
  {
    name: 'Cell',
    description: 'Render a Bulma grid cell.',
    component: Cell,
    schema: z.object({ span: z.coerce.number().int().min(1).max(12).optional() }),
    allowMarkdownChildren: true,
  },
  {
    name: 'PromptBox',
    description: 'Render a copy-oriented prompt or command box.',
    component: PromptBox,
    schema: z.object({ title: z.string().optional(), text: z.string().optional() }),
    allowMarkdownChildren: true,
  },
  {
    name: 'HtmlBlock',
    description: 'Render a raw HTML fragment that can use Bulma classes, scripts, and embeds.',
    component: HtmlBlock,
    schema: z.object({}),
    allowMarkdownChildren: true,
    examples: [
      `<HtmlBlock>\n\n\`\`\`html\n<div class="notification is-info is-light">Bulma HTML</div>\n\`\`\`\n\n</HtmlBlock>`,
    ],
  },
]

export async function loadRegistry(config: CanvasConfig, cwd: string): Promise<CanvasRegistry> {
  const manifests = new Map<string, CanvasComponentManifest<any>>()
  for (const manifest of builtInManifests) {
    manifests.set(manifest.name, manifest)
  }

  const manifestFile = config.components.manifest
    ? path.resolve(cwd, config.components.manifest)
    : path.resolve(cwd, '.simple-mdx-canvas/components.manifest.ts')

  if (existsSync(manifestFile)) {
    const mod = await loadExtensionModule(manifestFile, cwd)
    const userManifests = readUserManifests(mod, manifestFile)
    for (const manifest of userManifests) {
      if (manifests.has(manifest.name)) {
        throw new Error(`Duplicate component name "${manifest.name}" in "${manifestFile}".`)
      }
      manifests.set(manifest.name, manifest)
    }
  }

  return {
    manifests,
    components: Object.fromEntries(Array.from(manifests).map(([name, manifest]) => [name, manifest.component])),
  }
}

function readUserManifests(mod: Record<string, unknown>, file: string): CanvasComponentManifest<any>[] {
  const manifests = mod.default ?? mod.manifests
  if (!Array.isArray(manifests)) {
    throw new Error(`Component manifest "${file}" must default export an array or export one as "manifests".`)
  }

  return manifests.map((manifest, index) => validateUserManifest(manifest, file, index))
}

function validateUserManifest(value: unknown, file: string, index: number): CanvasComponentManifest<any> {
  if (!isRecord(value)) {
    throw new Error(`Component manifest "${file}" entry ${index + 1} must be an object.`)
  }
  if (typeof value.name !== 'string' || !/^[A-Z][A-Za-z0-9]*$/.test(value.name)) {
    throw new Error(`Component manifest "${file}" entry ${index + 1} needs a capitalized component name.`)
  }
  if (typeof value.description !== 'string' || value.description.trim() === '') {
    throw new Error(`Component manifest "${file}" entry "${value.name}" needs a description.`)
  }
  if (typeof value.component !== 'function') {
    throw new Error(`Component manifest "${file}" entry "${value.name}" needs a component function.`)
  }
  if (value.schema !== undefined && !hasSafeParse(value.schema)) {
    throw new Error(`Component manifest "${file}" entry "${value.name}" has an invalid schema.`)
  }
  if (value.allowMarkdownChildren !== undefined && typeof value.allowMarkdownChildren !== 'boolean') {
    throw new Error(`Component manifest "${file}" entry "${value.name}" has a non-boolean allowMarkdownChildren value.`)
  }
  if (value.examples !== undefined && (!Array.isArray(value.examples) || value.examples.some((example) => typeof example !== 'string'))) {
    throw new Error(`Component manifest "${file}" entry "${value.name}" has invalid examples.`)
  }
  if (value.dataProp !== undefined && typeof value.dataProp !== 'string') {
    throw new Error(`Component manifest "${file}" entry "${value.name}" has an invalid dataProp.`)
  }

  return value as CanvasComponentManifest<any>
}

function hasSafeParse(value: unknown): value is { safeParse: unknown } {
  return isRecord(value) && typeof value.safeParse === 'function'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function listComponentManifests(registry: CanvasRegistry): CanvasComponentManifest<any>[] {
  return Array.from(registry.manifests.values())
}
