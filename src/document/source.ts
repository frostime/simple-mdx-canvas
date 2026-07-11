import { readFile } from 'node:fs/promises'
import matter from 'gray-matter'
import type { CanvasDocument, CanvasFrontmatter } from '../contracts.js'

export async function loadDocument(filePath: string): Promise<CanvasDocument> {
  const source = await readFile(filePath, 'utf8')
  const parsed = matter(source)
  return {
    path: filePath,
    source,
    content: parsed.content,
    frontmatter: parsed.data as CanvasFrontmatter,
  }
}
