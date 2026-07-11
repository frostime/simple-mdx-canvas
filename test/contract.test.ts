import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadConfig } from '../src/config.ts'
import { loadRegistry } from '../src/components/registry.ts'
import { loadDocument } from '../src/document/source.ts'
import { validateDocument } from '../src/document/validate.ts'
import { renderToHtml } from '../src/render/render-document.ts'
import type { CanvasValidationError } from '../src/contracts.ts'

const projectRoot = process.cwd()
const fixtureRoot = path.join(projectRoot, 'test', 'fixtures')

type InvalidFixture = {
  file: string
  code: string
  line: number
  component?: string
  prop?: string
}

const invalidFixtures: InvalidFixture[] = [
  { file: 'unknown-component.mdx', code: 'SMC_UNKNOWN_COMPONENT', line: 1 },
  { file: 'component-schema.mdx', code: 'SMC_COMPONENT_SCHEMA', line: 1, component: 'Grid', prop: 'columns' },
  { file: 'forbidden-children.mdx', code: 'SMC_FORBIDDEN_CHILDREN', line: 1, component: 'Chart' },
  { file: 'forbidden-import.mdx', code: 'SMC_FORBIDDEN_IMPORT' },
  { file: 'unknown-data.mdx', code: 'SMC_UNKNOWN_DATA', line: 1, component: 'Table' },
  { file: 'mdx-parse.mdx', code: 'SMC_MDX_PARSE' },
]

const astRegressionFixtures = [
  'valid/fenced-jsx.mdx',
  'valid/object-chart-config.mdx',
  'valid/component-closing-text.mdx',
]

async function validateFixture(relativePath: string) {
  const config = await loadConfig(projectRoot)
  const registry = await loadRegistry(config, projectRoot)
  const document = await loadDocument(path.join(fixtureRoot, relativePath))
  return validateDocument(document, registry, config, { cwd: projectRoot })
}

function errorByCode(errors: CanvasValidationError[], code: string): CanvasValidationError {
  const match = errors.find((error) => error.code === code)
  assert.ok(match, `expected ${code}; received ${errors.map((error) => error.code).join(', ')}`)
  return match
}

test('document feature fixture validates and renders documented semantics', async () => {
  const result = await validateFixture('valid/document-features.mdx')
  assert.equal(result.ok, true)
  assert.deepEqual(result.errors, [])

  const outputDir = await mkdtemp(path.join(tmpdir(), 'smc-contract-'))
  const output = path.join(outputDir, 'features.html')
  try {
    const rendered = await renderToHtml({
      input: path.join(fixtureRoot, 'valid', 'document-features.mdx'),
      output,
      cwd: projectRoot,
    })
    const html = await readFile(output, 'utf8')

    assert.equal(rendered.output, output)
    assert.match(html, /<h1>Contract Feature Fixture<\/h1>/)
    assert.match(html, /class="katex"/)
    assert.match(html, /Callout title/)
    assert.match(html, /class="table is-striped is-hoverable is-fullwidth"/)
    assert.match(html, /data-canvas-chart=/)
    assert.match(html, /src="\.\/assets\/figure\.png"/)
    assert.match(html, /src="\.\/assets\/markdown\.png"/)
    assert.match(html, /<div class="contract-html">Raw HTML content<\/div>/)
    assert.match(html, /window\.contractHtmlBlock = true/)
    assert.match(html, /class="hljs language-ts"/)
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('frontmatter data fixture validates and embeds resolved data', async () => {
  const result = await validateFixture('valid/frontmatter-data.mdx')
  assert.equal(result.ok, true)
  assert.deepEqual(result.errors, [])

  const outputDir = await mkdtemp(path.join(tmpdir(), 'smc-contract-'))
  const output = path.join(outputDir, 'data.html')
  try {
    await renderToHtml({
      input: path.join(fixtureRoot, 'valid', 'frontmatter-data.mdx'),
      output,
      cwd: projectRoot,
    })
    const html = await readFile(output, 'utf8')

    assert.match(html, /Alpha/)
    assert.match(html, /queued/)
    assert.match(html, /data-canvas-chart=/)
    assert.doesNotMatch(html, /fetch\(/)
    assert.doesNotMatch(html, /src="[^"]*rows\.json"/)
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})

test('local theme CSS is appended to the generated artifact', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'smc-theme-'))
  const mdxPath = path.join(cwd, 'document.mdx')
  const output = path.join(cwd, 'document.html')
  try {
    await mkdir(path.join(cwd, 'themes'))
    await writeFile(path.join(cwd, 'simple-mdx-canvas.config.mjs'), `export default { themes: { localDir: 'themes' } }\n`)
    await writeFile(path.join(cwd, 'document.mdx'), '---\ntheme: contract\n---\n# Themed\n')
    await writeFile(path.join(cwd, 'themes', 'contract.css'), ':root { --contract-theme-color: teal; }\n')
    await renderToHtml({ input: mdxPath, output, cwd })

    const html = await readFile(output, 'utf8')
    assert.match(html, /--contract-theme-color: teal/)
    assert.match(html, /data-canvas-theme="contract"/)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

for (const fixturePath of astRegressionFixtures) {
  test(`AST validation accepts ${fixturePath}`, async () => {
    const result = await validateFixture(fixturePath)
    assert.equal(result.ok, true, result.errors.map((error) => error.message).join('\n'))
    assert.deepEqual(result.errors, [])
  })
}

for (const fixture of invalidFixtures) {
  test(`invalid fixture ${fixture.file} reports ${fixture.code}`, async () => {
    const result = await validateFixture(path.join('invalid', fixture.file))
    const error = errorByCode(result.errors, fixture.code)

    assert.equal(result.ok, false)
    if (fixture.line != null) assert.equal(error.line, fixture.line)
    if (fixture.component != null) assert.equal(error.component, fixture.component)
    if (fixture.prop != null) assert.equal(error.prop, fixture.prop)
  })
}

test('render rejects invalid documents without writing output', async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), 'smc-contract-'))
  const output = path.join(outputDir, 'invalid.html')
  try {
    await assert.rejects(
      () => renderToHtml({
        input: path.join(fixtureRoot, 'invalid', 'unknown-component.mdx'),
        output,
        cwd: projectRoot,
      }),
      (error: unknown) => String(error).includes('SMC_UNKNOWN_COMPONENT'),
    )
    await assert.rejects(() => readFile(output, 'utf8'))
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
})
