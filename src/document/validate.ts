import { compile } from '@mdx-js/mdx'
import path from 'node:path'
import { analyzeDocument, propsFromAttributes, type DocumentAnalysis, type DocumentElement } from './analysis.js'
import { resolveDocumentData, resolveFrom, type DocumentDataMap } from './data.js'
import { rehypePluginsFor, remarkPluginsFor } from './mdx-options.js'
import type { CanvasComponentManifest, CanvasConfig, CanvasDocument, CanvasRegistry, CanvasValidationError, CanvasValidationResult } from '../contracts.js'

export type ValidateDocumentOptions = {
  trustedMdx?: boolean
  cwd?: string
  analysis?: DocumentAnalysis
}

export type DocumentValidationResult = CanvasValidationResult & {
  analysis?: DocumentAnalysis
}

export async function validateDocument(
  document: CanvasDocument,
  registry: CanvasRegistry,
  config: CanvasConfig,
  options: ValidateDocumentOptions = {},
): Promise<DocumentValidationResult> {
  const errors: CanvasValidationError[] = []
  const trusted = options.trustedMdx === true
  let analysis: DocumentAnalysis

  try {
    analysis = options.analysis ?? analyzeDocument(document.content, config)
  } catch (err) {
    errors.push({
      code: 'SMC_MDX_PARSE',
      severity: 'error',
      file: document.path,
      message: err instanceof Error ? err.message : String(err),
      fix: 'Fix MDX syntax and rerun validation.',
    })
    return { ok: false, errors }
  }

  validateDocumentPolicy(analysis, document.path, config, trusted, errors)

  const data = await resolveDocumentData(document.frontmatter, {
    cwd: options.cwd ?? '',
    docDir: path.dirname(document.path),
    trustedMdx: trusted,
    file: document.path,
  })
  for (const dataError of data.errors) errors.push(withElementLocation(dataError, document.path))

  for (const element of analysis.elements) {
    if (!isRegisteredComponentName(element.name)) continue
    validateComponent(element, registry, data.data, document.path, errors)
  }

  try {
    await compile(document.content, {
      remarkPlugins: remarkPluginsFor(config),
      rehypePlugins: rehypePluginsFor(config),
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

  return { ok: errors.length === 0, errors, analysis }
}

function validateDocumentPolicy(
  analysis: DocumentAnalysis,
  file: string,
  config: CanvasConfig,
  trusted: boolean,
  errors: CanvasValidationError[],
): void {
  if (!trusted && !config.mdx.allowImports && analysis.esm.some((node) => /^\s*import\b/m.test(node.source))) {
    errors.push(validationError(file, 'SMC_FORBIDDEN_IMPORT', 'MDX import is disabled in safe mode.', undefined, 'Move components into the registry instead of importing them in the document.'))
  }
  if (!trusted && !config.mdx.allowExports && analysis.esm.some((node) => /^\s*export\b/m.test(node.source))) {
    errors.push(validationError(file, 'SMC_FORBIDDEN_EXPORT', 'MDX export is disabled in safe mode.', undefined, 'Use frontmatter for document metadata and registry components for reusable UI.'))
  }
  if (!config.mdx.allowRawHtml && analysis.elements.some((element) => element.name === 'script' || element.name === 'style')) {
    errors.push(validationError(file, 'SMC_FORBIDDEN_RAW_HTML', 'Raw <script> or <style> tags are disabled.', undefined, 'Use registered components and themes instead.'))
  }
  if (!trusted && hasInlineJavaScript(analysis)) {
    errors.push(validationError(file, 'SMC_FORBIDDEN_INLINE_JS', 'Inline event handlers or javascript: links are disabled.', undefined, 'Move behavior into a registered component.'))
  }
}

function hasInlineJavaScript(analysis: DocumentAnalysis): boolean {
  return analysis.elements.some((element) => element.attributes.some((attribute) => {
    if (/^on[A-Z][A-Za-z]+$/.test(attribute.name)) return true
    return attribute.name === 'href'
      && attribute.value.kind === 'static'
      && typeof attribute.value.value === 'string'
      && /^javascript:/i.test(attribute.value.value)
  }))
}

function validateComponent(
  element: DocumentElement,
  registry: CanvasRegistry,
  data: DocumentDataMap,
  file: string,
  errors: CanvasValidationError[],
): void {
  const manifest = registry.manifests.get(element.name)
  if (!manifest) {
    errors.push(validationError(file, 'SMC_UNKNOWN_COMPONENT', `Unknown component <${element.name}>.`, element.location.start.line, 'Use only registered components.'))
    return
  }

  const fromResolved = resolveFromForComponent(element, manifest, data, file)
  if ('error' in fromResolved) {
    errors.push(fromResolved.error)
    return
  }

  if (manifest.schema) {
    const result = manifest.schema.safeParse(fromResolved.props)
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          code: 'SMC_COMPONENT_SCHEMA',
          severity: 'error',
          file,
          line: element.location.start.line,
          component: element.name,
          prop: issue.path.join('.') || undefined,
          message: issue.message,
          fix: `Adjust <${element.name}> props to match its registered schema.`,
        })
      }
    }
  }

  if (!manifest.allowMarkdownChildren && element.hasClosingTag) {
    errors.push({
      code: 'SMC_FORBIDDEN_CHILDREN',
      severity: 'error',
      file,
      line: element.location.start.line,
      component: element.name,
      message: `<${element.name}> does not allow Markdown children.`,
      fix: `Use a self-closing <${element.name} ... /> tag or choose a component that allows children.`,
    })
  }
}

function resolveFromForComponent(
  element: DocumentElement,
  manifest: CanvasComponentManifest,
  data: DocumentDataMap,
  file: string,
): { props: Record<string, unknown> } | { error: CanvasValidationError } {
  const props = propsFromAttributes(element.attributes)
  if (!('from' in props)) return { props }

  const dataProp = manifest.dataProp
  if (!dataProp) {
    return { error: validationError(file, 'SMC_INVALID_PROJECTION', `Component <${element.name}> does not accept a "from" prop.`, element.location.start.line, 'Remove from or use a component that supports it (Table, Chart).') }
  }
  if (dataProp in props) {
    return { error: validationError(file, 'SMC_DATA_SOURCE_CONFLICT', `<${element.name}> has both "from" and "${dataProp}".`, element.location.start.line, `Use only one of from or ${dataProp}.`) }
  }

  const fromValue = props.from
  if (typeof fromValue !== 'string') {
    return { error: validationError(file, 'SMC_INVALID_PROJECTION', `<${element.name}> from must be a string projection like from="rows".`, element.location.start.line, 'Use from="name" or from="name[].field".') }
  }
  const resolved = resolveFrom(fromValue, data)
  if (!resolved.ok) return { error: withElementLocation(resolved.error, file, element) }

  const resolvedProps = { ...props }
  delete resolvedProps.from
  resolvedProps[dataProp] = resolved.value
  return { props: resolvedProps }
}

function isRegisteredComponentName(name: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(name)
}

function validationError(file: string, code: string, message: string, line?: number, fix?: string): CanvasValidationError {
  return { code, severity: 'error', file, line, message, fix }
}

function withElementLocation(
  error: CanvasValidationError,
  file: string,
  element?: DocumentElement,
): CanvasValidationError {
  return {
    ...error,
    file: error.file || file,
    line: error.line ?? element?.location.start.line,
    component: error.component ?? element?.name,
  }
}
