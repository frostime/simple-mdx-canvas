import type { ComponentType, ReactNode } from 'react'
import type { z } from 'zod'

export type CanvasThemeName = string

export type DataDeclaration = {
  $src?: string
  $inline?: unknown
  $derive?: Record<string, string>
}

export type DataDeclarations = Record<string, DataDeclaration>

export type CanvasFrontmatter = {
  title?: string
  description?: string
  theme?: CanvasThemeName
  data?: DataDeclarations
}

export type CanvasConfig = {
  theme: CanvasThemeName
  title?: string
  mdx: {
    gfm: boolean
    math: boolean
  }
  components: {
    manifest?: string
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
  examples?: string[]
  // When set, the component accepts a `from` prop resolved from frontmatter
  // data; the resolved value is injected under this prop name before schema.
  dataProp?: string
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
}
