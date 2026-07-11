import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import type { CanvasFrontmatter, CanvasValidationError } from '../contracts.js'

/**
 * Public surface: resolve frontmatter `data:` declarations, then resolve a
 * `from` projection against the resulting map. Consumed by both validate and
 * render; data lives in frontmatter, so this module never reads the MDX body.
 */

export type DocumentDataMap = Map<string, unknown>

export type ResolveDataOptions = {
  cwd: string
  docDir: string
  file: string
}

export type ResolveFromResult =
  | { ok: true; value: unknown }
  | { ok: false; error: CanvasValidationError }

export type ResolveDocumentDataResult = {
  data: DocumentDataMap
  errors: CanvasValidationError[]
}

// CanvasDeclarationLike mirrors DataDeclaration but $derive value union is
// weakly typed; YAML-parsed frontmatter is untyped at the boundary.
export type CanvasDeclarationLike = {
  $src?: unknown
  $inline?: unknown
  $derive?: unknown
}

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const DERIVE_TIMEOUT_MS = 200

// vm sandbox intrinsics: enough for ordinary data transforms (Object/Array,
// maps, dates, math) and nothing that reaches the Node host. This is a
// "prevent accidental misuse + limit time" layer, NOT an adversarial sandbox.
// Function remains reachable through constructor chains, so canvas documents
// and their data transforms are trusted local authoring inputs.
const SANDBOX_CONTEXT: Record<string, unknown> = Object.freeze({
  Math,
  JSON,
  Number,
  String,
  Boolean,
  Symbol,
  Date,
  Map,
  Set,
  RegExp,
  Array,
  Object,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
})

export async function resolveDocumentData(
  frontmatter: CanvasFrontmatter,
  options: ResolveDataOptions,
): Promise<ResolveDocumentDataResult> {
  const data: DocumentDataMap = new Map()
  const errors: CanvasValidationError[] = []
  const declarations = frontmatter.data

  if (!declarations) return { data, errors }

  for (const [declName, raw] of Object.entries(declarations)) {
    const decl = coerceDeclaration(declName, raw)
    if (!decl.ok) {
      errors.push(decl.error)
      continue
    }

    const baseResult = await resolveSource(declName, decl.value, options)
    if ('error' in baseResult) {
      errors.push(baseResult.error)
      continue
    }
    data.set(declName, baseResult.value)

    const deriveRaw = decl.value.$derive
    const hasDerive = deriveRaw !== undefined && deriveRaw !== null && deriveRaw !== false
    if (hasDerive) {
      if (typeof deriveRaw !== 'object' || Array.isArray(deriveRaw)) {
        errors.push(dataError('SMC_INVALID_DATA_SOURCE', options.file, `"$derive" on "${declName}" must be a map of { name: lambda } objects.`, 'Use $derive: { name: "r => ..." }.'))
        continue
      }
      for (const [derivedName, lambda] of Object.entries(deriveRaw as Record<string, unknown>)) {
        if (!IDENT_RE.test(derivedName)) {
          errors.push(dataError('SMC_INVALID_DATA_NAME', options.file, `Derived name "${derivedName}" is not a valid identifier.`, 'Use [A-Za-z_][A-Za-z0-9_]* for derived names.'))
          continue
        }
        if (data.has(derivedName)) {
          errors.push(dataError('SMC_DATA_REDECLARED', options.file, `Derived name "${derivedName}" from "${declName}" collides with an existing declaration.`, 'Pick a unique name.'))
          continue
        }
        if (typeof lambda !== 'string' || lambda.trim() === '') {
          errors.push(dataError('SMC_INVALID_DATA_SOURCE', options.file, `derive "${derivedName}" on "${declName}" must be a string lambda.`, 'Use the form "r => <expression>".'))
          continue
        }
        const evaluated = evalDerive(lambda, baseResult.value)
        if (!evaluated.ok) {
          errors.push(dataError('SMC_DATA_TRANSFORM_ERROR', options.file, `derive "${derivedName}" on "${declName}" failed: ${evaluated.error}`, 'Fix the lambda; it receives the resolved <declName> value and must return synchronously.'))
          continue
        }
        data.set(derivedName, evaluated.value)
      }
    }
  }

  return { data, errors }

  // coerceDeclaration narrows the raw YAML map at the boundary without
  // surfacing untyped shapes; it validates the magic-key shape and identifier.
  function coerceDeclaration(declName: string, raw: unknown): { ok: true; value: CanvasDeclarationLike } | { ok: false; error: CanvasValidationError } {
    if (!IDENT_RE.test(declName)) {
      return { ok: false, error: dataError('SMC_INVALID_DATA_NAME', options.file, `Declaration name "${declName}" is not a valid identifier.`, 'Use [A-Za-z_][A-Za-z0-9_]* for data names.') }
    }
    if (data.has(declName)) {
      return { ok: false, error: dataError('SMC_DATA_REDECLARED', options.file, `Declaration "${declName}" is declared twice.`, 'Each data name must be unique.') }
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: dataError('SMC_INVALID_DATA_SOURCE', options.file, `Declaration "${declName}" must be an object with $src/$inline/$derive.`, 'Indent the declaration object under data: in frontmatter.') }
    }
    return { ok: true, value: raw as CanvasDeclarationLike }
  }
}

async function resolveSource(
  name: string,
  decl: CanvasDeclarationLike,
  options: ResolveDataOptions,
): Promise<{ value: unknown } | { error: CanvasValidationError }> {
  const hasSrc = decl.$src !== undefined
  const hasInline = Object.prototype.hasOwnProperty.call(decl, '$inline')

  if (hasSrc && hasInline) {
    return { error: dataError('SMC_DATA_SOURCE_CONFLICT', options.file, `"${name}" declares both $src and $inline.`, 'Use only one source per declaration.') }
  }
  if (!hasSrc && !hasInline) {
    // $derive without $src/$inline: a declaration must carry a data source;
    // $derive transforms that source, it is not a source itself.
    return { error: dataError('SMC_INVALID_DATA_SOURCE', options.file, `"${name}" has no $src or $inline.`, 'Add $src or $inline to each declaration; $derive only transforms an existing source.') }
  }
  if (hasSrc) {
    if (typeof decl.$src !== 'string' || decl.$src.trim() === '') {
      return { error: dataError('SMC_INVALID_DATA_SOURCE', options.file, `"$src" on "${name}" must be a non-empty string path.`, 'Use a path like $src: data/foo.json.') }
    }
    if (path.isAbsolute(decl.$src)) {
      return { error: dataError('SMC_INVALID_DATA_SOURCE', options.file, `"$src" on "${name}" must be a relative path.`, 'Use a path relative to the .mdx file, like $src: data/foo.json.') }
    }
    const resolved = path.resolve(options.docDir, decl.$src)
    // Confine $src to the project root (cwd) so a document cannot read JSON
    // outside the workspace. cwd falls back to docDir when unset.
    const root = path.resolve(options.cwd || options.docDir)
    const rel = path.relative(root, resolved)
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      return { error: dataError('SMC_INVALID_DATA_SOURCE', options.file, `"$src" "${decl.$src}" on "${name}" escapes the project root.`, 'Keep $src paths inside the project directory.') }
    }
    if (!existsSync(resolved)) {
      return { error: dataError('SMC_MISSING_ASSET', options.file, `$src "${decl.$src}" for "${name}" not found (resolved: ${resolved}).`, 'Create the file or fix the path.') }
    }
    let contents: string
    try {
      contents = await readFile(resolved, 'utf8')
    } catch (err) {
      return { error: dataError('SMC_INVALID_DATA_SOURCE', options.file, `Failed to read $src "${decl.$src}" for "${name}": ${err instanceof Error ? err.message : String(err)}.`, 'Check file permissions.') }
    }
    try {
      return { value: JSON.parse(contents) }
    } catch (err) {
      return { error: dataError('SMC_INVALID_DATA_SOURCE', options.file, `$src "${decl.$src}" for "${name}" is not valid JSON: ${err instanceof Error ? err.message : String(err)}.`, 'Use a JSON file for $src.') }
    }
  }
  return { value: decl.$inline }
}

export function resolveFrom(from: string, data: DocumentDataMap): ResolveFromResult {
  const parsed = parseProjection(from)
  if (!parsed.ok) return parsed
  if (!data.has(parsed.projection.name)) {
    return { ok: false, error: dataError('SMC_UNKNOWN_DATA', '', `Data "${parsed.projection.name}" is not declared.`, 'Declare it under frontmatter data: or fix the from value.') }
  }
  const applied = applyOps(data.get(parsed.projection.name), parsed.projection.ops, false)
  if (!applied.ok) return applied
  return { ok: true, value: applied.value }
}

// Projection DSL: "X" | "X.f.g" | "X[i]" | "X[].f.g". The trailing ops after a
// "[]" extract are applied per element; missing fields/indexes inside an
// extraction return null (S3 alignment) so output length equals source length.
// Outside an extraction, a type mismatch (field on array, index on non-array)
// is a hard SMC_INVALID_PROJECTION — those are author typos, not data gaps.

type Op = { kind: 'field'; name: string } | { kind: 'index'; i: number } | { kind: 'extract' }
type Projection = { name: string; ops: Op[] }

function parseProjection(from: string): { ok: true; projection: Projection } | { ok: false; error: CanvasValidationError } {
  const nameMatch = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(from)
  if (!nameMatch) {
    return { ok: false, error: projError(from, `Expected a data name at the start of "${from}".`) }
  }
  const ops: Op[] = []
  let pos = nameMatch[0].length
  while (pos < from.length) {
    const c = from[pos]
    if (c === '.') {
      const fieldMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(from.slice(pos + 1))
      if (!fieldMatch) {
        return { ok: false, error: projError(from, `Expected a field name after "." in "${from}".`) }
      }
      ops.push({ kind: 'field', name: fieldMatch[0] })
      pos += 1 + fieldMatch[0].length
      continue
    }
    if (c === '[') {
      if (from[pos + 1] === ']') {
        ops.push({ kind: 'extract' })
        pos += 2
        continue
      }
      const numMatch = /^(\d+)\]/.exec(from.slice(pos + 1))
      if (!numMatch) {
        return { ok: false, error: projError(from, `Expected a decimal index or "[]" after "[" in "${from}".`) }
      }
      ops.push({ kind: 'index', i: Number(numMatch[1]) })
      pos += 1 + numMatch[0].length
      continue
    }
    return { ok: false, error: projError(from, `Unexpected character "${c}" in projection "${from}".`) }
  }
  return { ok: true, projection: { name: nameMatch[0], ops } }
}

function applyOps(
  value: unknown,
  ops: Op[],
  inExtract: boolean,
): { ok: true; value: unknown } | { ok: false; error: CanvasValidationError } {
  if (ops.length === 0) return { ok: true, value }
  const [op, ...rest] = ops
  if (op.kind === 'extract') {
    if (!Array.isArray(value)) {
      return { ok: false, error: projError('', `Cannot apply "[]" to a non-array value.`) }
    }
    const results: unknown[] = []
    for (const element of value) {
      const result = applyOps(element, rest, true)
      if (!result.ok) return result
      results.push(result.value)
    }
    return { ok: true, value: results }
  }
  if (op.kind === 'field') {
    const valid = value != null && typeof value === 'object' && !Array.isArray(value)
    if (!valid) {
      if (inExtract) return { ok: true, value: null }
      return { ok: false, error: projError('', `Cannot read field "${op.name}" from a non-object value.`) }
    }
    const obj = value as Record<string, unknown>
    return applyOps(op.name in obj ? obj[op.name] : null, rest, inExtract)
  }
  if (!Array.isArray(value)) {
    if (inExtract) return { ok: true, value: null }
    return { ok: false, error: projError('', `Cannot index into a non-array value at [${op.i}].`) }
  }
  return applyOps(op.i >= 0 && op.i < value.length ? value[op.i] : null, rest, inExtract)
}

// Define AND invoke inside one runInNewContext so the timeout covers the
// lambda body. vm's timeout applies only to synchronous script execution;
// returning a function and calling it later would escape the timeout.
// Input is JSON-serializable because it came from $src/$inline (YAML/JSON).
function evalDerive(lambda: string, input: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  const inputJson = JSON.stringify(input)
  const script = `(${lambda})(${inputJson})`
  try {
    const result = vm.runInNewContext(script, SANDBOX_CONTEXT, {
      timeout: DERIVE_TIMEOUT_MS,
      filename: 'data-derive.js',
    })
    // structuredClone moves the value into the outer realm so downstream
    // identity / prototype checks behave; it also rejects function returns.
    return { ok: true, value: structuredClone(result) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function projError(from: string, message: string): CanvasValidationError {
  const detail = from ? ` "${from}"` : ''
  return dataError('SMC_INVALID_PROJECTION', '', `Invalid from projection${detail}: ${message}`, 'Use X, X.f.g, X[i], or X[].f.g.')
}

function dataError(code: string, file: string, message: string, fix: string): CanvasValidationError {
  return { code, severity: 'error', file, message, fix }
}