import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { evaluate } from '@mdx-js/mdx'
import { createProcessor } from '@mdx-js/mdx'
import * as jsxRuntime from 'react/jsx-runtime'
import { loadConfig } from './config.js'
import { loadDocument } from './document.js'
import { loadRegistry } from './registry.js'
import { validateDocument } from './validate.js'
import { loadChartJsScript, loadThemeCss } from './theme.js'
import { rehypePluginsFor, remarkPluginsFor } from './mdx-options.js'
import { CanvasValidationException } from './errors.js'
import { buildHtmlShell } from '../runtime/html-shell.js'
import { resolveDocumentData, resolveFrom } from './document-data.js'
import type { CanvasRegistry } from './types.js'
import type { RenderOptions } from './types.js'

export async function renderToHtml(options: RenderOptions): Promise<{ html: string; output?: string }> {
  const cwd = options.cwd
  const input = path.resolve(cwd, options.input)
  const config = await loadConfig(cwd)
  const registry = await loadRegistry(config, cwd)
  const document = await loadDocument(input)

  const theme = options.theme ?? document.frontmatter.theme ?? config.theme

  if (options.validate !== false) {
    const result = await validateDocument(document, registry, config, { trustedMdx: options.trustedMdx, cwd })
    if (!result.ok) throw new CanvasValidationException(result.errors)
  }

  const outputSource = await resolveDataSources(document, registry, config, cwd, options.trustedMdx === true)

  const evaluated = await evaluate(outputSource, {
    ...(jsxRuntime as any),
    remarkPlugins: remarkPluginsFor(config) as any,
    rehypePlugins: rehypePluginsFor(config) as any,
    development: false,
  })

  const MDXContent = evaluated.default as React.ComponentType<any>
  const body = renderToStaticMarkup(React.createElement(MDXContent, { components: registry.components }))
  const css = await loadThemeCss(config, theme, cwd)
  const chartJsScript = body.includes('data-canvas-chart') ? await loadChartJsScript() : undefined
  const title = document.frontmatter.title ?? config.title ?? path.basename(input)

  const html = buildHtmlShell({
    title,
    description: document.frontmatter.description,
    body,
    css,
    theme,
    chartJsScript,
  })

  if (options.output) {
    const outputPath = path.resolve(cwd, options.output)
    await writeFile(outputPath, html, 'utf8')
    return { html, output: outputPath }
  }

  return { html }
}

// resolveDataSources returns the document source with each consumer component's
// `from="X"` attribute spliced into `dataProp={...resolved JSON...}`. Data is
// resolved at build time (P1) and embedded into the single HTML artifact; no
// runtime fetch. mdast positions give byte-exact source spans, so only the
// `from="..."` token is replaced and everything else — whitespace, other
// attributes, fenced code — stays untouched. Splices are applied right-to-left
// so earlier offsets remain valid.
//
// Fail-closed: if data resolution or any `from` projection fails, render aborts
// with a CanvasValidationException rather than emitting a partial/empty result.
// This guards the `validate: false` path; when validation runs, the same errors
// surface there first.
async function resolveDataSources(
  document: { path: string; content: string; frontmatter: { data?: unknown } },
  registry: CanvasRegistry,
  config: Awaited<ReturnType<typeof loadConfig>>,
  cwd: string,
  trustedMdx: boolean,
): Promise<string> {
  const data = await resolveDocumentData(document.frontmatter as never, {
    cwd,
    docDir: path.dirname(document.path),
    trustedMdx,
    file: document.path,
  })
  if (data.errors.length > 0) {
    throw new CanvasValidationException(data.errors)
  }
  const consumers = new Map<string, string>()
  for (const [name, manifest] of registry.manifests) {
    if (manifest.dataProp) consumers.set(name, manifest.dataProp)
  }
  if (consumers.size === 0 || data.data.size === 0) return document.content

  const elements = await extractElements(document.content, config)

  const splices: { start: number; end: number; replacement: string }[] = []
  for (const el of elements) {
    const dataProp = consumers.get(el.name)
    if (!dataProp) continue
    for (const attr of el.attributes) {
      if (attr.name !== 'from') continue
      if (typeof attr.value !== 'string') continue
      const resolved = resolveFrom(attr.value, data.data)
      if (!resolved.ok) {
        throw new CanvasValidationException([resolved.error])
      }
      // Splice as a JSX expression container: JSON output is a valid JS literal.
      const replacement = `${dataProp}={${JSON.stringify(resolved.value)}}`
      splices.push({ start: attr.start, end: attr.end, replacement })
    }
  }
  if (splices.length === 0) return document.content

  splices.sort((a, b) => b.start - a.start)
  let out = document.content
  for (const s of splices) out = out.slice(0, s.start) + s.replacement + out.slice(s.end)
  return out
}

async function extractElements(
  source: string,
  config: Awaited<ReturnType<typeof loadConfig>>,
): Promise<Array<{ name: string; attributes: Array<{ name: string; value: unknown; start: number; end: number }> }>> {
  const proc = createProcessor({ remarkPlugins: remarkPluginsFor(config) as any })
  const tree = proc.parse(source) as { children?: unknown[] }
  const out: Array<{ name: string; attributes: Array<{ name: string; value: unknown; start: number; end: number }> }> = []
  walk(tree.children ?? [], (node: any) => {
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return
    if (!node.name) return
    const attrs = (node.attributes ?? []).map((a: any) => ({
      name: a.name ?? '',
      value: attrValue(a.value),
      start: a.position?.start?.offset ?? 0,
      end: a.position?.end?.offset ?? 0,
    }))
    out.push({ name: node.name, attributes: attrs })
  })
  return out
}

function attrValue(value: unknown): unknown {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && (value as { type?: string }).type === 'mdxJsxAttributeValueExpression') {
    const raw = (value as { value?: unknown }).value
    return typeof raw === 'string' ? raw : undefined
  }
  return undefined
}

function walk(nodes: unknown[], visit: (node: any) => void): void {
  for (const node of nodes as any[]) {
    visit(node)
    if (node && typeof node === 'object' && Array.isArray(node.children)) walk(node.children, visit)
  }
}
