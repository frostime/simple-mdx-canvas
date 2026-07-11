import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { evaluate, type EvaluateOptions } from '@mdx-js/mdx'
import * as jsxRuntime from 'react/jsx-runtime'
import { loadConfig } from '../config.js'
import { loadRegistry } from '../components/registry.js'
import { resolveDocumentData, resolveFrom } from '../document/data.js'
import { CanvasValidationException } from '../document/errors.js'
import { rehypePluginsFor, remarkPluginsFor } from '../document/mdx-options.js'
import { loadDocument } from '../document/source.js'
import { validateDocument } from '../document/validate.js'
import type { DocumentAttribute, DocumentAnalysis } from '../document/analysis.js'
import { buildHtmlShell } from './html-shell.js'
import { loadChartJsScript, loadThemeCss } from './theme.js'
import type { CanvasDocument, CanvasRegistry, RenderOptions } from '../contracts.js'

const mdxRuntime: Pick<EvaluateOptions, 'Fragment' | 'jsx' | 'jsxs'> = jsxRuntime

export async function renderToHtml(options: RenderOptions): Promise<{ html: string; output?: string }> {
  const cwd = options.cwd
  const input = path.resolve(cwd, options.input)
  const config = await loadConfig(cwd)
  const registry = await loadRegistry(config, cwd)
  const document = await loadDocument(input)
  const theme = options.theme ?? document.frontmatter.theme ?? config.theme

  const validation = await validateDocument(document, registry, config, {
    trustedMdx: options.trustedMdx,
    cwd,
  })
  if (!validation.ok) throw new CanvasValidationException(validation.errors)

  const outputSource = await resolveDataSources(
    document,
    registry,
    validation.analysis,
    cwd,
    options.trustedMdx === true,
  )
  const evaluated = await evaluate(outputSource, {
    ...mdxRuntime,
    remarkPlugins: remarkPluginsFor(config),
    rehypePlugins: rehypePluginsFor(config),
    development: false,
  })

  const MDXContent = evaluated.default as React.ComponentType<Record<string, unknown>>
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

  if (!options.output) return { html }

  const outputPath = path.resolve(cwd, options.output)
  await writeFile(outputPath, html, 'utf8')
  return { html, output: outputPath }
}

async function resolveDataSources(
  document: CanvasDocument,
  registry: CanvasRegistry,
  analysis: DocumentAnalysis | undefined,
  cwd: string,
  trustedMdx: boolean,
): Promise<string> {
  if (!analysis) return document.content

  const data = await resolveDocumentData(document.frontmatter, {
    cwd,
    docDir: path.dirname(document.path),
    trustedMdx,
    file: document.path,
  })
  if (data.errors.length > 0) throw new CanvasValidationException(data.errors)

  const consumers = new Map<string, string>()
  for (const [name, manifest] of registry.manifests) {
    if (manifest.dataProp) consumers.set(name, manifest.dataProp)
  }
  if (consumers.size === 0 || data.data.size === 0) return document.content

  const splices: SourceSplice[] = []
  for (const element of analysis.elements) {
    const dataProp = consumers.get(element.name)
    if (!dataProp) continue
    const from = findStaticAttribute(element.attributes, 'from')
    if (!from || from.value.kind !== 'static' || typeof from.value.value !== 'string') continue

    const resolved = resolveFrom(from.value.value, data.data)
    if (!resolved.ok) throw new CanvasValidationException([resolved.error])
    splices.push({
      start: from.location.start.offset,
      end: from.location.end.offset,
      replacement: `${dataProp}={${JSON.stringify(resolved.value)}}`,
    })
  }

  return applySourceSplices(document.content, splices)
}

type SourceSplice = {
  start: number
  end: number
  replacement: string
}

function findStaticAttribute(attributes: DocumentAttribute[], name: string): DocumentAttribute | undefined {
  return attributes.find((attribute) => attribute.name === name && attribute.value.kind === 'static')
}

function applySourceSplices(source: string, splices: SourceSplice[]): string {
  if (splices.length === 0) return source
  const ordered = [...splices].sort((left, right) => right.start - left.start)
  let result = source
  for (const splice of ordered) {
    result = result.slice(0, splice.start) + splice.replacement + result.slice(splice.end)
  }
  return result
}
