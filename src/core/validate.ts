import { compile } from '@mdx-js/mdx'
import path from 'node:path'
import { rehypePluginsFor, remarkPluginsFor } from './mdx-options.js'
import { resolveDocumentData, resolveFrom, type DocumentDataMap } from './document-data.js'
import type { CanvasComponentManifest, CanvasConfig, CanvasDocument, CanvasRegistry, CanvasValidationError, CanvasValidationResult } from './types.js'

const componentTagRegex = /<([A-Z][A-Za-z0-9]*)(\s[^<>]*?)?(\/?)>/g
const importRegex = /^\s*import\s+/m
const exportRegex = /^\s*export\s+/m
const rawScriptRegex = /<script\b/i
const rawStyleRegex = /<style\b/i
const htmlEventHandlerRegex = /\son[A-Z][A-Za-z]+\s*=/
const hrefJavascriptRegex = /href\s*=\s*["']javascript:/i

export async function validateDocument(
  document: CanvasDocument,
  registry: CanvasRegistry,
  config: CanvasConfig,
  options: { trustedMdx?: boolean; cwd?: string } = {},
): Promise<CanvasValidationResult> {
  const errors: CanvasValidationError[] = []
  const source = document.content
  const policySource = stripFencedCode(source)
  const trusted = options.trustedMdx === true

  if (!trusted && !config.mdx.allowImports && importRegex.test(policySource)) {
    errors.push(error(document.path, 'SMC_FORBIDDEN_IMPORT', 'MDX import is disabled in safe mode.', undefined, 'Move components into the registry instead of importing them in the document.'))
  }
  if (!trusted && !config.mdx.allowExports && exportRegex.test(policySource)) {
    errors.push(error(document.path, 'SMC_FORBIDDEN_EXPORT', 'MDX export is disabled in safe mode.', undefined, 'Use frontmatter for document metadata and registry components for reusable UI.'))
  }
  if (!config.mdx.allowRawHtml && (rawScriptRegex.test(policySource) || rawStyleRegex.test(policySource))) {
    errors.push(error(document.path, 'SMC_FORBIDDEN_RAW_HTML', 'Raw <script> or <style> tags are disabled.', undefined, 'Use registered components and themes instead.'))
  }
  if (!trusted && (htmlEventHandlerRegex.test(policySource) || hrefJavascriptRegex.test(policySource))) {
    errors.push(error(document.path, 'SMC_FORBIDDEN_INLINE_JS', 'Inline event handlers or javascript: links are disabled.', undefined, 'Move behavior into a registered component.'))
  }

  const docDir = path.dirname(document.path)
  const data = await resolveDocumentData(document.frontmatter, {
    cwd: options.cwd ?? '',
    docDir,
    trustedMdx: trusted,
    file: document.path,
  })
  for (const err of data.errors) errors.push(fillLine(err, source))

  for (const match of source.matchAll(componentTagRegex)) {
    const [, name, attrs = '', selfClosing] = match
    const manifest = registry.manifests.get(name)
    const line = lineOf(source, match.index ?? 0)
    if (!manifest) {
      errors.push(error(document.path, 'SMC_UNKNOWN_COMPONENT', `Unknown component <${name}>.`, line, 'Use only registered components.'))
      continue
    }

    const props = parseAttributes(attrs)
    const fromResolved = resolveFromForComponent(name, props, manifest, data.data, document.path, line)
    if ('error' in fromResolved) {
      errors.push(fromResolved.error)
      continue
    }
    const schemaProps = fromResolved.props
    if (manifest.schema) {
      const result = manifest.schema.safeParse(schemaProps)
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            code: 'SMC_COMPONENT_SCHEMA',
            severity: 'error',
            file: document.path,
            line,
            component: name,
            prop: issue.path.join('.') || undefined,
            message: issue.message,
            fix: `Adjust <${name}> props to match its registered schema.`,
          })
        }
      }
    }

    if (!manifest.allowMarkdownChildren && !selfClosing && hasClosingTag(source, name, match.index ?? 0)) {
      errors.push({
        code: 'SMC_FORBIDDEN_CHILDREN',
        severity: 'error',
        file: document.path,
        line,
        component: name,
        message: `<${name}> does not allow Markdown children.`,
        fix: `Use a self-closing <${name} ... /> tag or choose a component that allows children.`,
      })
    }
  }

  try {
    await compile(source, {
      remarkPlugins: remarkPluginsFor(config) as any,
      rehypePlugins: rehypePluginsFor(config) as any,
      jsx: true,
      outputFormat: 'function-body',
      development: false,
    })
  } catch (err) {
    errors.push({
      code: 'SMC_MDX_PARSE',
      severity: 'error',
      file: document.path,
      message: err instanceof Error ? err.message : String(err),
      fix: 'Fix MDX syntax and rerun validation.',
    })
  }

  return { ok: errors.length === 0, errors }
}

function error(file: string, code: string, message: string, line?: number, fix?: string): CanvasValidationError {
  return { code, severity: 'error', file, line, message, fix }
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split(/\r?\n/).length
}

function hasClosingTag(source: string, name: string, index: number): boolean {
  return source.slice(index).includes(`</${name}>`)
}

function stripFencedCode(source: string): string {
  return source.replace(/^```[\s\S]*?^```/gm, '')
}

function parseAttributes(input: string): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  const attrRegex = /([A-Za-z_][A-Za-z0-9_]*)\s*=\s*("[^"]*"|'[^']*'|\{[^}]*\})/g
  for (const match of input.matchAll(attrRegex)) {
    const [, key, raw] = match
    props[key] = parseAttributeValue(raw)
  }
  return props
}

function parseAttributeValue(raw: string): unknown {
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1)
  }
  if (raw.startsWith('{') && raw.endsWith('}')) {
    const body = raw.slice(1, -1).trim()
    if (/^-?\d+(\.\d+)?$/.test(body)) return Number(body)
    if (body === 'true') return true
    if (body === 'false') return false
    if (body.startsWith('[') || body.startsWith('{')) {
      try {
        return JSON.parse(body)
      } catch {
        return body
      }
    }
    return body
  }
  return raw
}

// resolveFromForComponent injects the resolved `from` value into a copy of the
// parsed props so the existing zod schema can check the real data shape; when a
// component has no dataProp, `from` is left untouched and falls through to its
// own schema (or to SMC_INVALID_PROJECTION if the manifest doesn't define one).
function resolveFromForComponent(
  name: string,
  props: Record<string, unknown>,
  manifest: CanvasComponentManifest,
  data: DocumentDataMap,
  file: string,
  line: number,
): { props: Record<string, unknown> } | { error: CanvasValidationError } {
  if (!('from' in props)) return { props }
  const dataProp = manifest.dataProp
  if (!dataProp) {
    return { error: error(file, 'SMC_INVALID_PROJECTION', `Component <${name}> does not accept a "from" prop.`, line, 'Remove from or use a component that supports it (Table, Chart).') }
  }
  if (dataProp in props) {
    return { error: error(file, 'SMC_DATA_SOURCE_CONFLICT', `<${name}> has both "from" and "${dataProp}".`, line, `Use only one of from or ${dataProp}.`) }
  }
  const fromValue = props.from
  if (typeof fromValue !== 'string') {
    return { error: error(file, 'SMC_INVALID_PROJECTION', `<${name}> from must be a string projection like from="rows".`, line, 'Use from="name" or from="name[].field".') }
  }
  const resolved = resolveFrom(fromValue, data)
  if (!resolved.ok) {
    return { error: fillLine(resolved.error, '', file, line, name) }
  }
  const injected: Record<string, unknown> = { ...props }
  delete injected.from
  injected[dataProp] = resolved.value
  return { props: injected }
}

// fillLine attaches location to errors that originate from document-data /
// resolveFrom, which never see the source. Data-derivation errors carry no
// line (they span frontmatter); from-projection errors should land on the
// consuming tag's line, passed in by the caller.
function fillLine(err: CanvasValidationError, source: string, file?: string, line?: number, component?: string): CanvasValidationError {
  void source
  return {
    ...err,
    file: err.file || file || '',
    line: err.line ?? line,
    component: err.component ?? component,
  }
}
