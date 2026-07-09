import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { CanvasConfig } from './types.js'

const require = createRequire(import.meta.url)

export async function loadThemeCss(config: CanvasConfig, theme: string, cwd: string): Promise<string> {
  const cssParts = [
    await readBulmaCss(),
    config.mdx.math ? await readKatexCss() : '',
    await readPackageStyle('canvas.css'),
    await readPackageStyle('print.css'),
  ]

  const localTheme = await readLocalThemeCss(config, theme, cwd)
  if (localTheme) cssParts.push(localTheme)

  return cssParts.filter(Boolean).join('\n\n')
}

export async function loadChartJsScript(): Promise<string | undefined> {
  try {
    const chartEntry = require.resolve('chart.js')
    const chartPath = path.join(path.dirname(chartEntry), 'chart.umd.min.js')
    return readFile(chartPath, 'utf8')
  } catch {
    return undefined
  }
}

async function readBulmaCss(): Promise<string> {
  const bulmaPath = require.resolve('bulma/css/bulma.css')
  return readFile(bulmaPath, 'utf8')
}

async function readKatexCss(): Promise<string> {
  const katexPath = require.resolve('katex/dist/katex.min.css')
  const css = await readFile(katexPath, 'utf8')
  return inlineCssUrls(css, path.dirname(katexPath))
}

async function inlineCssUrls(css: string, baseDir: string): Promise<string> {
  const replacements = new Map<string, string>()
  const urlRegex = /url\((['"]?)([^'"()]+)\1\)/g

  for (const match of css.matchAll(urlRegex)) {
    const original = match[0]
    const relativeUrl = match[2]
    if (/^(data:|https?:|#)/i.test(relativeUrl)) continue
    if (replacements.has(original)) continue

    try {
      const assetPath = path.resolve(baseDir, relativeUrl)
      const asset = await readFile(assetPath)
      replacements.set(original, `url("data:${mimeFor(assetPath)};base64,${asset.toString('base64')}")`)
    } catch {
      // Keep the original URL if an optional asset cannot be inlined.
    }
  }

  let result = css
  for (const [from, to] of replacements) result = result.replaceAll(from, to)
  return result
}

function mimeFor(filePath: string): string {
  if (filePath.endsWith('.woff2')) return 'font/woff2'
  if (filePath.endsWith('.woff')) return 'font/woff'
  if (filePath.endsWith('.ttf')) return 'font/ttf'
  if (filePath.endsWith('.otf')) return 'font/otf'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

async function readPackageStyle(fileName: string): Promise<string> {
  const stylePath = fileURLToPath(new URL(`../styles/${fileName}`, import.meta.url))
  return readFile(stylePath, 'utf8')
}

async function readLocalThemeCss(config: CanvasConfig, theme: string, cwd: string): Promise<string | undefined> {
  const localDir = config.themes.localDir
  if (!localDir) return undefined

  const localTheme = path.resolve(cwd, localDir, `${theme}.css`)
  if (!existsSync(localTheme)) return undefined

  return readFile(localTheme, 'utf8')
}
