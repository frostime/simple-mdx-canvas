import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import type { CanvasConfig } from './types.js'

export function remarkPluginsFor(config: CanvasConfig): unknown[] {
  const plugins: unknown[] = []
  if (config.mdx.gfm) plugins.push(remarkGfm)
  if (config.mdx.math) plugins.push(remarkMath)
  return plugins
}

export function rehypePluginsFor(config: CanvasConfig): unknown[] {
  const plugins: unknown[] = []
  if (config.mdx.math) plugins.push(rehypeKatex)
  plugins.push(rehypeHighlight)
  return plugins
}
