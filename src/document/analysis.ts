import { createProcessor } from '@mdx-js/mdx'
import { remarkPluginsFor } from './mdx-options.js'
import type { CanvasConfig } from '../contracts.js'

export type DocumentLocation = {
  start: { line: number; offset: number }
  end: { line: number; offset: number }
}

export type DocumentAttributeValue =
  | { kind: 'static'; value: unknown }
  | { kind: 'expression'; source: string }

export type DocumentAttribute = {
  name: string
  value: DocumentAttributeValue
  location: DocumentLocation
}

export type DocumentElement = {
  name: string
  attributes: DocumentAttribute[]
  hasClosingTag: boolean
  location: DocumentLocation
}

export type DocumentEsm = {
  source: string
  location: DocumentLocation
}

export type DocumentAnalysis = {
  elements: DocumentElement[]
  esm: DocumentEsm[]
}

export function analyzeDocument(source: string, config: CanvasConfig): DocumentAnalysis {
  const processor = createProcessor({ remarkPlugins: remarkPluginsFor(config) })
  const tree = processor.parse(source)
  const elements: DocumentElement[] = []
  const esm: DocumentEsm[] = []

  visit(tree, (node) => {
    if (node.type === 'mdxjsEsm') {
      esm.push({ source: readString(node.value), location: readLocation(node.position) })
      return
    }
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') return

    const name = readString(node.name)
    if (!name) return
    const location = readLocation(node.position)
    elements.push({
      name,
      attributes: readAttributes(node.attributes),
      hasClosingTag: hasClosingTag(source, location, name),
      location,
    })
  })

  return { elements, esm }
}

export function propsFromAttributes(attributes: DocumentAttribute[]): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  for (const attribute of attributes) {
    props[attribute.name] = attribute.value.kind === 'static'
      ? attribute.value.value
      : attribute.value.source
  }
  return props
}

type SyntaxNode = Record<string, unknown>

function visit(node: unknown, inspect: (node: SyntaxNode) => void): void {
  if (!isRecord(node)) return
  inspect(node)
  const children = node.children
  if (!Array.isArray(children)) return
  for (const child of children) visit(child, inspect)
}

function hasClosingTag(source: string, location: DocumentLocation, name: string): boolean {
  return new RegExp(`</${escapeRegExp(name)}\\s*>\\s*$`).test(source.slice(location.start.offset, location.end.offset))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readAttributes(value: unknown): DocumentAttribute[] {
  if (!Array.isArray(value)) return []
  const attributes: DocumentAttribute[] = []
  for (const attribute of value) {
    if (!isRecord(attribute) || attribute.type !== 'mdxJsxAttribute') continue
    const name = readString(attribute.name)
    if (!name) continue
    attributes.push({
      name,
      value: readAttributeValue(attribute.value),
      location: readLocation(attribute.position),
    })
  }
  return attributes
}

function readAttributeValue(value: unknown): DocumentAttributeValue {
  if (value == null) return { kind: 'static', value: true }
  if (typeof value === 'string') return { kind: 'static', value }
  if (!isRecord(value) || value.type !== 'mdxJsxAttributeValueExpression') {
    return { kind: 'expression', source: '' }
  }

  const source = readString(value.value)
  const expression = expressionFromEstree(value.data)
  const staticValue = expression === undefined ? undefined : evaluateStaticExpression(expression)
  return staticValue == null ? { kind: 'expression', source } : staticValue
}

function expressionFromEstree(data: unknown): unknown {
  if (!isRecord(data) || !isRecord(data.estree)) return undefined
  const body = data.estree.body
  if (!Array.isArray(body) || body.length !== 1 || !isRecord(body[0])) return undefined
  return body[0].expression
}

function evaluateStaticExpression(node: unknown): DocumentAttributeValue | undefined {
  if (!isRecord(node)) return undefined
  if (node.type === 'Literal') return { kind: 'static', value: node.value }

  if (node.type === 'ArrayExpression' && Array.isArray(node.elements)) {
    const values: unknown[] = []
    for (const element of node.elements) {
      const evaluated = evaluateStaticExpression(element)
      if (!evaluated || evaluated.kind !== 'static') return undefined
      values.push(evaluated.value)
    }
    return { kind: 'static', value: values }
  }

  if (node.type === 'ObjectExpression' && Array.isArray(node.properties)) {
    const entries: Array<[string, unknown]> = []
    for (const property of node.properties) {
      const entry = evaluateStaticProperty(property)
      if (!entry) return undefined
      entries.push(entry)
    }
    return { kind: 'static', value: Object.fromEntries(entries) }
  }

  if (node.type === 'TemplateLiteral' && Array.isArray(node.expressions) && node.expressions.length === 0 && Array.isArray(node.quasis)) {
    const text = node.quasis.map((quasi) => {
      if (!isRecord(quasi) || !isRecord(quasi.value)) return undefined
      return readString(quasi.value.cooked)
    })
    if (text.some((part) => part === undefined)) return undefined
    return { kind: 'static', value: text.join('') }
  }

  if (node.type === 'UnaryExpression' && (node.operator === '-' || node.operator === '+' || node.operator === '!')) {
    const evaluated = evaluateStaticExpression(node.argument)
    if (!evaluated || evaluated.kind !== 'static') return undefined
    if ((node.operator === '-' || node.operator === '+') && typeof evaluated.value === 'number') {
      return { kind: 'static', value: node.operator === '-' ? -evaluated.value : evaluated.value }
    }
    if (node.operator === '!') return { kind: 'static', value: !evaluated.value }
  }

  return undefined
}

function evaluateStaticProperty(property: unknown): [string, unknown] | undefined {
  if (!isRecord(property) || property.type !== 'Property' || property.computed === true || property.kind !== 'init') {
    return undefined
  }
  const key = propertyKey(property.key)
  const value = evaluateStaticExpression(property.value)
  if (key === undefined || !value || value.kind !== 'static') return undefined
  return [key, value.value]
}

function propertyKey(key: unknown): string | undefined {
  if (!isRecord(key)) return undefined
  if (key.type === 'Identifier') return readString(key.name)
  if (key.type === 'Literal') return typeof key.value === 'string' || typeof key.value === 'number' ? String(key.value) : undefined
  return undefined
}

function readLocation(value: unknown): DocumentLocation {
  if (!isRecord(value) || !isRecord(value.start) || !isRecord(value.end)) {
    return { start: { line: 1, offset: 0 }, end: { line: 1, offset: 0 } }
  }
  return {
    start: { line: readNumber(value.start.line, 1), offset: readNumber(value.start.offset, 0) },
    end: { line: readNumber(value.end.line, 1), offset: readNumber(value.end.offset, 0) },
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

function isRecord(value: unknown): value is SyntaxNode {
  return typeof value === 'object' && value !== null
}
