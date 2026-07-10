import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { resolveDocumentData, resolveFrom } from '../src/core/document-data.ts'
import type { CanvasFrontmatter } from '../src/core/types.ts'

/**
 * Behavior tests for the frontmatter data source module. Covers the public
 * contract (resolveDocumentData / resolveFrom), not internal helpers.
 *
 * S3 rule: inside `X[].f`, missing fields on individual elements yield null so
 * output length equals source length. Top-level wrong-type access is a hard
 * SMC_INVALID_PROJECTION, not lenient padding.
 */

const optsBase = {
  cwd: process.cwd(),
  trustedMdx: false,
  file: 'example.mdx',
} as const

function fm(data: CanvasFrontmatter['data']): CanvasFrontmatter {
  return { data }
}

function codes(out: Awaited<ReturnType<typeof resolveDocumentData>>): string[] {
  return out.errors.map((e) => e.code)
}

// ----------------------------------------------------------------------------
// Source resolution
// ----------------------------------------------------------------------------

test('resolves $inline object and array literals', async () => {
  const out = await resolveDocumentData(
    fm({ obj: { $inline: { type: 'bar', count: 3 } }, arr: { $inline: [{ a: 1 }, { a: 2 }] } }),
    { ...optsBase, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), [])
  assert.deepEqual(out.data.get('obj'), { type: 'bar', count: 3 })
  assert.deepEqual(out.data.get('arr'), [{ a: 1 }, { a: 2 }])
})

test('resolves $src relative to docDir', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-data-'))
  await writeFile(path.join(dir, 'rows.json'), JSON.stringify([{ x: 1 }, { x: 2 }]))
  const out = await resolveDocumentData(
    fm({ rows: { $src: 'rows.json' } }),
    { ...optsBase, docDir: dir },
  )
  assert.deepEqual(codes(out), [])
  assert.deepEqual(out.data.get('rows'), [{ x: 1 }, { x: 2 }])
  await rm(dir, { recursive: true, force: true })
})

test('$src missing → SMC_MISSING_ASSET', async () => {
  const out = await resolveDocumentData(
    fm({ rows: { $src: 'no-such.json' } }),
    { ...optsBase, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_MISSING_ASSET'])
})

test('$src non-JSON → SMC_INVALID_DATA_SOURCE', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-data-'))
  await writeFile(path.join(dir, 'broken.json'), '{ not json')
  const out = await resolveDocumentData(
    fm({ rows: { $src: 'broken.json' } }),
    { ...optsBase, docDir: dir },
  )
  assert.deepEqual(codes(out), ['SMC_INVALID_DATA_SOURCE'])
  await rm(dir, { recursive: true, force: true })
})

test('$inline + $src together → SMC_DATA_SOURCE_CONFLICT', async () => {
  const out = await resolveDocumentData(
    fm({ rows: { $src: 'rows.json', $inline: [{ a: 1 }] } }),
    { ...optsBase, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_DATA_SOURCE_CONFLICT'])
})

test('declaration with neither $src/$inline/$derive → SMC_INVALID_DATA_SOURCE', async () => {
  const out = await resolveDocumentData(
    fm({ empty: {} }),
    { ...optsBase, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_INVALID_DATA_SOURCE'])
})

test('declaration name not an identifier → SMC_INVALID_DATA_NAME', async () => {
  const out = await resolveDocumentData(
    fm({ 'bad name': { $inline: 1 } }),
    { ...optsBase, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_INVALID_DATA_NAME'])
})

test('declaration value not an object → SMC_INVALID_DATA_SOURCE', async () => {
  const out = await resolveDocumentData(
    fm({ x: ({ $inline: 1 }) as unknown }),  // eslint-disable-line @typescript-eslint/no-explicit-any
    { ...optsBase, docDir: process.cwd() },
  )
  // pretend non-object (we test the non-object path via a non-object literal)
  const out2 = await resolveDocumentData(
    { data: { x: 'nope' } as unknown as never } as CanvasFrontmatter,
    { ...optsBase, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), [])
  assert.deepEqual(codes(out2), ['SMC_INVALID_DATA_SOURCE'])
})

// ----------------------------------------------------------------------------
// $derive
// ----------------------------------------------------------------------------

test('$derive under trusted joins namespaced outputs', async () => {
  const out = await resolveDocumentData(
    fm({
      rows: {
        $inline: [{ name: 'a', count: 3 }, { name: 'b', count: 5 }],
        $derive: { counts: 'r => r.map(x => x.count)', names: 'r => r.map(x => x.name)' },
      },
    }),
    { ...optsBase, trustedMdx: true, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), [])
  assert.deepEqual(out.data.get('counts'), [3, 5])
  assert.deepEqual(out.data.get('names'), ['a', 'b'])
  assert.deepEqual(out.data.get('rows'), [{ name: 'a', count: 3 }, { name: 'b', count: 5 }])
})

test('$derive without --trusted-mdx reports SMC_FORBIDDEN_DATA_TRANSFORM; base still resolved', async () => {
  const out = await resolveDocumentData(
    fm({ rows: { $inline: [1, 2], $derive: { doubled: 'r => r.map(x => x * 2)' } } }),
    { ...optsBase, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_FORBIDDEN_DATA_TRANSFORM'])
  assert.deepEqual(out.data.get('rows'), [1, 2])
  assert.equal(out.data.has('doubled'), false)
})

test('$derive bad identifier → SMC_INVALID_DATA_NAME', async () => {
  const out = await resolveDocumentData(
    fm({ rows: { $inline: [1], $derive: { 'bad name': 'r => r' } } }),
    { ...optsBase, trustedMdx: true, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_INVALID_DATA_NAME'])
})

test('$derive non-string lambda → SMC_INVALID_DATA_SOURCE', async () => {
  const out = await resolveDocumentData(
    fm({ rows: { $inline: [1], $derive: { bad: 42 as unknown as string } } }),
    { ...optsBase, trustedMdx: true, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_INVALID_DATA_SOURCE'])
})

test('$derive syntax error → SMC_DATA_TRANSFORM_ERROR', async () => {
  const out = await resolveDocumentData(
    fm({ rows: { $inline: [1], $derive: { bad: 'r =>' } } }),
    { ...optsBase, trustedMdx: true, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_DATA_TRANSFORM_ERROR'])
})

test('$derive reaching a sandbox-blocked global → SMC_DATA_TRANSFORM_ERROR', async () => {
  const out = await resolveDocumentData(
    fm({ rows: { $inline: [1], $derive: { leaks: 'r => process' } } }),
    { ...optsBase, trustedMdx: true, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_DATA_TRANSFORM_ERROR'])
})

test('$derive infinite loop → SMC_DATA_TRANSFORM_ERROR (timeout)', async () => {
  const out = await resolveDocumentData(
    fm({ rows: { $inline: [1], $derive: { loop: 'r => { while (true) {} }' } } }),
    { ...optsBase, trustedMdx: true, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_DATA_TRANSFORM_ERROR'])
})

test('$derive name collides with own declaration name → SMC_DATA_REDECLARED', async () => {
  const out = await resolveDocumentData(
    fm({ x: { $inline: 1, $derive: { x: 'r => r' } } }),
    { ...optsBase, trustedMdx: true, docDir: process.cwd() },
  )
  assert.deepEqual(codes(out), ['SMC_DATA_REDECLARED'])
})

// ----------------------------------------------------------------------------
// resolveFrom — projection DSL
// ----------------------------------------------------------------------------

function fromFixtures() {
  return new Map<string, unknown>([
    ['rows', [{ name: 'a', count: 3, sub: { tag: 'x' } }, { name: 'b', count: 5, sub: { tag: 'y' } }]],
    ['single', { x: 1, y: { z: 9 } }],
    ['arr', [10, 20, 30]],
  ])
}

function assertOk(r: ReturnType<typeof resolveFrom>): unknown {
  assert.equal(r.ok, true)
  return (r as { ok: true; value: unknown }).value
}

function errCode(r: ReturnType<typeof resolveFrom>): string {
  assert.equal(r.ok, false)
  return (r as { ok: false; error: { code: string } }).error.code
}

test('resolveFrom whole X', () => {
  assert.deepEqual(assertOk(resolveFrom('rows', fromFixtures())),
    [{ name: 'a', count: 3, sub: { tag: 'x' } }, { name: 'b', count: 5, sub: { tag: 'y' } }])
})

test('resolveFrom object path X.f.g', () => {
  assert.equal(assertOk(resolveFrom('single.y.z', fromFixtures())), 9)
})

test('resolveFrom index X[i] and X[i].f', () => {
  assert.equal(assertOk(resolveFrom('arr[1]', fromFixtures())), 20)
  assert.equal(assertOk(resolveFrom('rows[0].name', fromFixtures())), 'a')
})

test('resolveFrom extract X[].f preserves length with null padding (S3)', () => {
  const data = new Map([['rows', [{ count: 1 }, { other: 2 }, { count: 3 }]]])
  assert.deepEqual(assertOk(resolveFrom('rows[].count', data)), [1, null, 3])
})

test('resolveFrom extract nested path X[].f.g', () => {
  assert.deepEqual(assertOk(resolveFrom('rows[].sub.tag', fromFixtures())), ['x', 'y'])
})

test('resolveFrom extract over heterogeneous elements pads null only (no type error)', () => {
  const data = new Map([['rows', [null, 7, { count: 1 }]]])
  assert.deepEqual(assertOk(resolveFrom('rows[].count', data)), [null, null, 1])
})

test('resolveFrom unknown name → SMC_UNKNOWN_DATA', () => {
  assert.equal(errCode(resolveFrom('missing', fromFixtures())), 'SMC_UNKNOWN_DATA')
})

test('resolveFrom bogus grammar → SMC_INVALID_PROJECTION', () => {
  for (const c of ['.', 'rows..a', 'rows[', 'rows[abc]', 'rows[1', 'rows!', '1rows']) {
    assert.equal(errCode(resolveFrom(c, fromFixtures())), 'SMC_INVALID_PROJECTION', `case: ${c}`)
  }
})

test('resolveFrom wrong-type access at top level → SMC_INVALID_PROJECTION', () => {
  assert.equal(errCode(resolveFrom('num.x', new Map([['num', 5]]))), 'SMC_INVALID_PROJECTION')
  assert.equal(errCode(resolveFrom('obj[0]', new Map([['obj', { x: 1 }]]))), 'SMC_INVALID_PROJECTION')
  assert.equal(errCode(resolveFrom('obj[].x', new Map([['obj', { x: 1 }]]))), 'SMC_INVALID_PROJECTION')
})

test('resolveFrom missing field / out-of-bounds at top level yields null (leniency)', () => {
  assert.equal(assertOk(resolveFrom('obj.missing', new Map([['obj', { a: 1 }]]))), null)
  assert.equal(assertOk(resolveFrom('arr[9]', new Map([['arr', [1, 2]]]))), null)
})