import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import path from 'node:path'

const projectRoot = process.cwd()
const tsxCli = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')

function runCli(args: string[], cwd = projectRoot): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, path.join(projectRoot, 'src', 'cli.ts'), ...args], { cwd })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

test('CLI no longer exposes trusted-mdx or no-validate', async () => {
  const [renderHelp, validateHelp, unknownOption, version] = await Promise.all([
    runCli(['render', '--help']),
    runCli(['validate', '--help']),
    runCli(['render', 'test/fixtures/valid/fenced-jsx.mdx', '-o', 'tmp/ignored.html', '--no-validate']),
    runCli(['--version']),
  ])
  const packageVersion = (JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as { version: string }).version

  assert.equal(renderHelp.code, 0)
  assert.doesNotMatch(renderHelp.stdout, /trusted-mdx|no-validate/)
  assert.equal(validateHelp.code, 0)
  assert.doesNotMatch(validateHelp.stdout, /trusted-mdx/)
  assert.notEqual(unknownOption.code, 0)
  assert.match(unknownOption.stderr, /unknown option '--no-validate'/)
  assert.equal(version.stdout.trim(), packageVersion)
})

test('init writes only supported configuration fields', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'smc-init-'))
  try {
    const initialized = await runCli(['init'], cwd)
    const [config, tsconfig] = await Promise.all([
      readFile(path.join(cwd, 'simple-mdx-canvas.config.ts'), 'utf8'),
      readFile(path.join(cwd, '.simple-mdx-canvas', 'tsconfig.json'), 'utf8'),
    ])

    assert.equal(initialized.code, 0)
    assert.match(config, /components:/)
    assert.match(config, /themes:/)
    assert.doesNotMatch(config, /snippets|selfContained|allowImports|allowExports|allowRawHtml/)
    assert.match(tsconfig, /"jsx": "react-jsx"/)
    assert.match(tsconfig, /"include": \["\*\*\/\*"\]/)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
