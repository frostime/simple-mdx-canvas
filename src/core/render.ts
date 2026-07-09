import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { evaluate } from '@mdx-js/mdx'
import * as jsxRuntime from 'react/jsx-runtime'
import remarkGfm from 'remark-gfm'
import { loadConfig } from './config.js'
import { loadDocument } from './document.js'
import { loadRegistry } from './registry.js'
import { validateDocument } from './validate.js'
import { loadChartJsScript, loadThemeCss } from './theme.js'
import { CanvasValidationException } from './errors.js'
import { buildHtmlShell } from '../runtime/html-shell.js'
import type { RenderOptions } from './types.js'

export async function renderToHtml(options: RenderOptions): Promise<{ html: string; output?: string }> {
  const cwd = options.cwd
  const input = path.resolve(cwd, options.input)
  const config = await loadConfig(cwd)
  const registry = await loadRegistry(config, cwd)
  const document = await loadDocument(input)

  const theme = options.theme ?? document.frontmatter.theme ?? config.theme

  if (options.validate !== false) {
    const result = await validateDocument(document, registry, config, { trustedMdx: options.trustedMdx })
    if (!result.ok) throw new CanvasValidationException(result.errors)
  }

  const evaluated = await evaluate(document.content, {
    ...(jsxRuntime as any),
    remarkPlugins: config.mdx.gfm ? [remarkGfm] : [],
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
