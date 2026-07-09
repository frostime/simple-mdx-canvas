import { z } from 'zod'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import type { CanvasConfig, CanvasComponentManifest, CanvasRegistry } from './types.js'
import {
  Chart,
  Columns,
  Column,
  Callout,
  Cards,
  Card,
  Tabs,
  Tab,
  Steps,
  Step,
  Figure,
  PromptBox,
  Table,
  Tags,
  Tag,
  Grid,
  Cell,
} from '../runtime/components/index.js'

const jsonArrayString = z.string().refine((value) => {
  try {
    return Array.isArray(JSON.parse(value))
  } catch {
    return false
  }
}, 'must be a JSON array string')

export const builtInManifests: CanvasComponentManifest<any>[] = [
  {
    name: 'Chart',
    description: 'Render a bar, line, pie, or scatter chart from JSON data.',
    component: Chart,
    schema: z.object({
      type: z.enum(['bar', 'line', 'pie', 'scatter']),
      title: z.string().optional(),
      description: z.string().optional(),
      x: z.string().optional(),
      y: z.string().optional(),
      data: z.union([jsonArrayString, z.array(z.record(z.unknown()))]),
    }),
    allowMarkdownChildren: false,
    renderMode: 'hydrated',
    examples: [
      `<Chart type="bar" title="Cost" x="model" y="cost" data='[{"model":"A","cost":3.2}]' />`,
    ],
  },
  {
    name: 'Columns',
    description: 'Render multiple Markdown columns.',
    component: Columns,
    schema: z.object({ cols: z.coerce.number().int().min(2).max(4).optional() }),
    allowMarkdownChildren: true,
    renderMode: 'static',
  },
  {
    name: 'Column',
    description: 'A child column for Columns.',
    component: Column,
    schema: z.object({ title: z.string().optional() }),
    allowMarkdownChildren: true,
    renderMode: 'static',
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
    renderMode: 'static',
  },
  {
    name: 'Cards',
    description: 'Container for Card components.',
    component: Cards,
    schema: z.object({}),
    allowMarkdownChildren: true,
    renderMode: 'static',
  },
  {
    name: 'Card',
    description: 'Render a card with optional title.',
    component: Card,
    schema: z.object({ title: z.string().optional() }),
    allowMarkdownChildren: true,
    renderMode: 'static',
  },
  {
    name: 'Tabs',
    description: 'Container for Tab blocks. Rendered as stacked sections in static output.',
    component: Tabs,
    schema: z.object({}),
    allowMarkdownChildren: true,
    renderMode: 'static',
  },
  {
    name: 'Tab',
    description: 'A child tab section.',
    component: Tab,
    schema: z.object({ title: z.string() }),
    allowMarkdownChildren: true,
    renderMode: 'static',
  },
  {
    name: 'Steps',
    description: 'Container for ordered Step components.',
    component: Steps,
    schema: z.object({}),
    allowMarkdownChildren: true,
    renderMode: 'static',
  },
  {
    name: 'Step',
    description: 'A single process step.',
    component: Step,
    schema: z.object({ title: z.string().optional() }),
    allowMarkdownChildren: true,
    renderMode: 'static',
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
    renderMode: 'static',
  },

  {
    name: 'Table',
    description: 'Render a Bulma table from JSON rows.',
    component: Table,
    schema: z.object({
      data: z.union([jsonArrayString, z.array(z.record(z.unknown()))]),
      columns: z.union([z.string(), z.array(z.string())]).optional(),
      striped: z.boolean().optional(),
      bordered: z.boolean().optional(),
      narrow: z.boolean().optional(),
      hoverable: z.boolean().optional(),
      fullwidth: z.boolean().optional(),
    }),
    allowMarkdownChildren: false,
    renderMode: 'static',
    examples: [
      `<Table columns='["name","status"]' data='[{"name":"Build","status":"pass"}]' />`,
    ],
  },
  {
    name: 'Tags',
    description: 'Render a Bulma tags container.',
    component: Tags,
    schema: z.object({}),
    allowMarkdownChildren: true,
    renderMode: 'static',
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
    renderMode: 'static',
    examples: [`<Tag color="success" light>Ready</Tag>`],
  },
  {
    name: 'Grid',
    description: 'Render a Bulma fixed-grid container.',
    component: Grid,
    schema: z.object({ columns: z.coerce.number().int().min(1).max(12).optional() }),
    allowMarkdownChildren: true,
    renderMode: 'static',
  },
  {
    name: 'Cell',
    description: 'Render a Bulma grid cell.',
    component: Cell,
    schema: z.object({ span: z.coerce.number().int().min(1).max(12).optional() }),
    allowMarkdownChildren: true,
    renderMode: 'static',
  },
  {
    name: 'PromptBox',
    description: 'Render a copy-oriented prompt or command box.',
    component: PromptBox,
    schema: z.object({ title: z.string().optional() }),
    allowMarkdownChildren: true,
    renderMode: 'static',
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
    const mod = await import(pathToFileURL(manifestFile).href)
    const userManifests = (mod.default ?? mod.manifests ?? []) as CanvasComponentManifest<any>[]
    for (const manifest of userManifests) {
      if (manifests.has(manifest.name)) {
        throw new Error(`Duplicate component name: ${manifest.name}`)
      }
      manifests.set(manifest.name, manifest)
    }
  }

  return {
    manifests,
    components: Object.fromEntries(Array.from(manifests).map(([name, manifest]) => [name, manifest.component])),
  }
}

export function listComponentManifests(registry: CanvasRegistry): CanvasComponentManifest<any>[] {
  return Array.from(registry.manifests.values())
}
