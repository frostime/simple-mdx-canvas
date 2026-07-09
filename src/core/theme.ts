import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { CanvasConfig } from './types.js'

const require = createRequire(import.meta.url)

export async function loadThemeCss(config: CanvasConfig, theme: string, cwd: string): Promise<string> {
  const cssParts = [await readBulmaCss(), await readPackageStyle('canvas.css'), await readPackageStyle('print.css')]

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
