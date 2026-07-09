import type { ComponentType, ReactNode } from 'react'
import type { z } from 'zod'

export type CanvasThemeName = 'default' | 'academic' | 'compact' | string

export type CanvasFrontmatter = {
  title?: string
  description?: string
  theme?: CanvasThemeName
  layout?: 'document' | 'report'
}

export type CanvasConfig = {
  theme: CanvasThemeName
  title?: string
  output: {
    selfContained: boolean
  }
  mdx: {
    gfm: boolean
    allowImports: boolean
    allowExports: boolean
    allowRawHtml: boolean
  }
  components: {
    localDir?: string
    manifest?: string
  }
  snippets: {
    localDir?: string
  }
  themes: {
    localDir?: string
  }
}

export type CanvasComponentManifest<Props = unknown> = {
  name: string
  description: string
  component: ComponentType<Props & { children?: ReactNode }>
  schema?: z.ZodType<Props>
  allowMarkdownChildren?: boolean
  renderMode?: 'static' | 'hydrated'
  examples?: string[]
}

export type CanvasRegistry = {
  manifests: Map<string, CanvasComponentManifest<any>>
  components: Record<string, ComponentType<any>>
}

export type CanvasDocument = {
  path: string
  source: string
  content: string
  frontmatter: CanvasFrontmatter
}

export type CanvasValidationSeverity = 'error' | 'warning'

export type CanvasValidationError = {
  code: string
  severity: CanvasValidationSeverity
  file: string
  line?: number
  component?: string
  prop?: string
  message: string
  fix?: string
}

export type CanvasValidationResult = {
  ok: boolean
  errors: CanvasValidationError[]
}

export type RenderOptions = {
  input: string
  output?: string
  cwd: string
  theme?: string
  trustedMdx?: boolean
  validate?: boolean
}
