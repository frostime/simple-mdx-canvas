import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadConfig } from '../src/config.ts'
import { loadRegistry } from '../src/components/registry.ts'
import { validateDocument } from '../src/document/validate.ts'
import { renderToHtml } from '../src/render/render-document.ts'
import type { CanvasDocument } from '../src/contracts.ts'

/**
 * Integration tests: frontmatter data sources flow through validate and render
 * via the public API. Asserts observable outcomes (error codes, rendered HTML
 * content), not internal wiring.
 */

function doc(dir: string, frontmatter: string, body: string): CanvasDocument {
  return {
    path: path.join(dir, 'test.mdx'),
    source: `---\n${frontmatter}\n---\n${body}`,
    content: body,
    frontmatter: parseFrontmatter(frontmatter),
  }
}

// Minimal frontmatter parser for tests; production uses gray-matter.
function parseFrontmatter(yaml: string): CanvasDocument['frontmatter'] {
  const data: Record<string, unknown> = {}
  for (const line of yaml.split('\n')) {
    const m = /^(\w+):\s*(.*)$/.exec(line.trim())
    if (m) data[m[1]] = m[2] === '' ? undefined : m[2]
  }
  // yaml is intentionally simple; richer shapes set by caller via buildFm().
  return data as never
}

function buildFm(data: Record<string, unknown>): Record<string, unknown> {
  return { data }
}

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-it-'))
  const config = await loadConfig(process.cwd())
  const registry = await loadRegistry(config, process.cwd())
  return { dir, config, registry }
}

function codes(result: Awaited<ReturnType<typeof validateDocument>>): string[] {
  return result.errors.map((e) => e.code)
}

// ----------------------------------------------------------------------------
// validate: from resolution against frontmatter data
// ----------------------------------------------------------------------------

test('validate accepts <Table from="rows"> with matching frontmatter data', async () => {
  const { dir, config, registry } = await setup()
  const document = doc(dir, '', '') as CanvasDocument
  document.frontmatter = buildFm({
    rows: { $inline: [{ a: 1 }, { a: 2 }] },
  }) as never
  document.source = `---\ndata:\n  rows:\n    $inline:\n      - { a: 1 }\n      - { a: 2 }\n---\n<Table from="rows" columns='["a"]' />\n`
  document.content = `<Table from="rows" columns='["a"]' />\n`
  const result = await validateDocument(document, registry, config, { trustedMdx: false, cwd: dir })
  assert.deepEqual(codes(result), [])
  await rm(dir, { recursive: true, force: true })
})

test('validate rejects from pointing at undeclared data → SMC_UNKNOWN_DATA', async () => {
  const { dir, config, registry } = await setup()
  const document: CanvasDocument = {
    path: path.join(dir, 't.mdx'),
    source: `---\ntitle: t\n---\n<Table from="missing" columns='["a"]' />\n`,
    content: `<Table from="missing" columns='["a"]' />\n`,
    frontmatter: { title: 't' },
  }
  const result = await validateDocument(document, registry, config, { trustedMdx: false, cwd: dir })
  assert.ok(codes(result).includes('SMC_UNKNOWN_DATA'))
  await rm(dir, { recursive: true, force: true })
})

test('validate rejects from + native dataProp both present → SMC_DATA_SOURCE_CONFLICT', async () => {
  const { dir, config, registry } = await setup()
  const document: CanvasDocument = {
    path: path.join(dir, 't.mdx'),
    source: `---\ntitle: t\n---\n<Table from="rows" data='[{"a":1}]' columns='["a"]' />\n`,
    content: `<Table from="rows" data='[{"a":1}]' columns='["a"]' />\n`,
    frontmatter: { title: 't', data: { rows: { $inline: [{ a: 1 }] } } } as never,
  }
  const result = await validateDocument(document, registry, config, { trustedMdx: false, cwd: dir })
  assert.ok(codes(result).includes('SMC_DATA_SOURCE_CONFLICT'))
  await rm(dir, { recursive: true, force: true })
})

test('validate rejects $derive in safe mode → SMC_FORBIDDEN_DATA_TRANSFORM', async () => {
  const { dir, config, registry } = await setup()
  const document: CanvasDocument = {
    path: path.join(dir, 't.mdx'),
    source: `---\ntitle: t\ndata:\n  rows:\n    $inline:\n      - { a: 1 }\n    $derive:\n      ds: "r => r"\n---\n<Table from="ds" columns='["a"]' />\n`,
    content: `<Table from="ds" columns='["a"]' />\n`,
    frontmatter: { title: 't', data: { rows: { $inline: [{ a: 1 }], $derive: { ds: 'r => r' } } } } as never,
  }
  const result = await validateDocument(document, registry, config, { trustedMdx: false, cwd: dir })
  assert.ok(codes(result).includes('SMC_FORBIDDEN_DATA_TRANSFORM'))
  await rm(dir, { recursive: true, force: true })
})

test('validate accepts $derive under --trusted-mdx', async () => {
  const { dir, config, registry } = await setup()
  const document: CanvasDocument = {
    path: path.join(dir, 't.mdx'),
    source: `---\ntitle: t\ndata:\n  rows:\n    $inline:\n      - { a: 1 }\n      - { a: 2 }\n    $derive:\n      ds: "r => r"\n---\n<Table from="ds" columns='["a"]' />\n`,
    content: `<Table from="ds" columns='["a"]' />\n`,
    frontmatter: { title: 't', data: { rows: { $inline: [{ a: 1 }, { a: 2 }], $derive: { ds: 'r => r' } } } } as never,
  }
  const result = await validateDocument(document, registry, config, { trustedMdx: true, cwd: dir })
  assert.deepEqual(codes(result), [])
  await rm(dir, { recursive: true, force: true })
})

test('validate rejects from on a component without dataProp → SMC_INVALID_PROJECTION', async () => {
  const { dir, config, registry } = await setup()
  const document: CanvasDocument = {
    path: path.join(dir, 't.mdx'),
    source: `---\ntitle: t\ndata:\n  x: { $inline: 1 }\n---\n<Callout from="x">body</Callout>\n`,
    content: `<Callout from="x">body</Callout>\n`,
    frontmatter: { title: 't', data: { x: { $inline: 1 } } } as never,
  }
  const result = await validateDocument(document, registry, config, { trustedMdx: false, cwd: dir })
  assert.ok(codes(result).includes('SMC_INVALID_PROJECTION'))
  await rm(dir, { recursive: true, force: true })
})

// ----------------------------------------------------------------------------
// render: data is baked into the self-contained HTML
// ----------------------------------------------------------------------------

test('render embeds $src data into HTML; no fetch, no external json src', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-it-'))
  await writeFile(path.join(dir, 'rows.json'), JSON.stringify([{ name: 'alpha', status: 'ok' }]))
  const mdxPath = path.join(dir, 'doc.mdx')
  const outPath = path.join(dir, 'out.html')
  await writeFile(mdxPath, `---\ntitle: t\ndata:\n  rows:\n    $src: rows.json\n---\n# H\n<Table from="rows" columns='[{"key":"name","label":"Name"},{"key":"status","label":"Status"}]' />\n`)
  const result = await renderToHtml({ input: mdxPath, output: outPath, cwd: dir, validate: true })
  const html = await readFile(outPath, 'utf8')
  assert.ok(html.includes('alpha'), 'rendered HTML must contain the row data')
  assert.ok(!html.includes('fetch('), 'rendered HTML must not fetch data at runtime')
  assert.ok(!/src="[^"]*\.json"/.test(html), 'rendered HTML must not reference external json')
  void result
  await rm(dir, { recursive: true, force: true })
})

test('render embeds Chart config resolved from frontmatter data', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-it-'))
  const mdxPath = path.join(dir, 'doc.mdx')
  const outPath = path.join(dir, 'out.html')
  await writeFile(mdxPath, `---\ntitle: t\ndata:\n  cfg:\n    $inline:\n      type: bar\n      data:\n        labels: [A, B]\n        datasets:\n          - { label: x, data: [4, 9] }\n---\n<Chart from="cfg" title="c" />\n`)
  await renderToHtml({ input: mdxPath, output: outPath, cwd: dir, validate: true })
  const html = await readFile(outPath, 'utf8')
  assert.ok(html.includes('data-canvas-chart'), 'chart canvas must carry the resolved config')
  assert.ok(html.includes('"datasets"'), 'resolved chart config must be embedded')
  await rm(dir, { recursive: true, force: true })
})

test('render rejects derive without --trusted-mdx (validate blocks render)', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-it-'))
  const mdxPath = path.join(dir, 'doc.mdx')
  const outPath = path.join(dir, 'out.html')
  await writeFile(mdxPath, `---\ntitle: t\ndata:\n  rows:\n    $inline:\n      - { a: 1 }\n    $derive:\n      ds: "r => r"\n---\n<Table from="ds" columns='["a"]' />\n`)
  await assert.rejects(
    () => renderToHtml({ input: mdxPath, output: outPath, cwd: dir, validate: true }),
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      return msg.includes('SMC_FORBIDDEN_DATA_TRANSFORM') || msg.includes('trusted-mdx')
    },
  )
  await rm(dir, { recursive: true, force: true })
})

test('render with --no-validate still fail-closes on $derive without --trusted-mdx', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-it-'))
  const mdxPath = path.join(dir, 'doc.mdx')
  const outPath = path.join(dir, 'out.html')
  await writeFile(mdxPath, `---\ntitle: t\ndata:\n  rows:\n    $inline:\n      - { a: 1 }\n    $derive:\n      ds: "r => r"\n---\n<Table from="ds" columns='["a"]' />\n`)
  await assert.rejects(
    () => renderToHtml({ input: mdxPath, output: outPath, cwd: dir, validate: false, trustedMdx: false }),
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      return msg.includes('SMC_FORBIDDEN_DATA_TRANSFORM')
    },
  )
  await rm(dir, { recursive: true, force: true })
})

test('render with --no-validate fail-closes on unknown from target', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-it-'))
  const mdxPath = path.join(dir, 'doc.mdx')
  const outPath = path.join(dir, 'out.html')
  await writeFile(mdxPath, `---\ntitle: t\ndata:\n  rows:\n    $inline:\n      - { a: 1 }\n---\n<Table from="missing" columns='["a"]' />\n`)
  await assert.rejects(
    () => renderToHtml({ input: mdxPath, output: outPath, cwd: dir, validate: false }),
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      return msg.includes('SMC_UNKNOWN_DATA')
    },
  )
  await rm(dir, { recursive: true, force: true })
})