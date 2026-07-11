import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import type { CanvasConfig } from './contracts.js'

export const defaultConfig: CanvasConfig = {
  theme: 'default',
  mdx: {
    gfm: true,
    math: true,
  },
  components: {},
  themes: {},
}

export function defineConfig(config: Partial<CanvasConfig>): Partial<CanvasConfig> {
  return config
}

export async function loadConfig(cwd: string): Promise<CanvasConfig> {
  const configNames = [
    'simple-mdx-canvas.config.ts',
    'simple-mdx-canvas.config.mjs',
    'simple-mdx-canvas.config.js',
  ]

  for (const name of configNames) {
    const file = path.resolve(cwd, name)
    if (!existsSync(file)) continue
    const mod = await import(pathToFileURL(file).href)
    const userConfig = (mod.default ?? mod.config ?? {}) as Partial<CanvasConfig>
    return mergeConfig(defaultConfig, userConfig)
  }

  return defaultConfig
}

export function mergeConfig(base: CanvasConfig, override: Partial<CanvasConfig>): CanvasConfig {
  return {
    ...base,
    ...override,
    mdx: { ...base.mdx, ...override.mdx },
    components: { ...base.components, ...override.components },
    themes: { ...base.themes, ...override.themes },
  }
}
