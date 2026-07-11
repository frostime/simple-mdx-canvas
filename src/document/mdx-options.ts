import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import type { PluggableList } from 'unified'
import type { CanvasConfig } from '../contracts.js'

export function remarkPluginsFor(config: CanvasConfig): PluggableList {
  const plugins: PluggableList = []
  if (config.mdx.gfm) plugins.push(remarkGfm)
  if (config.mdx.math) plugins.push(remarkMath)
  return plugins
}

export function rehypePluginsFor(config: CanvasConfig): PluggableList {
  const plugins: PluggableList = []
  if (config.mdx.math) plugins.push(rehypeKatex)
  plugins.push(rehypeHighlight)
  return plugins
}
