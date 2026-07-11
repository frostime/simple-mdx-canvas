import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

const projectRoot = process.cwd()
const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')

test('packed package initializes and renders a TSX component with a relative import', async () => {
  const workDir = await mkdtemp(path.join(tmpdir(), 'smc-package-'))
  const packageDir = path.join(workDir, 'package')
  const consumerDir = path.join(workDir, 'consumer')

  try {
    await Promise.all([
      mkdir(packageDir, { recursive: true }),
      mkdir(consumerDir, { recursive: true }),
    ])
    await runNpm(['pack', '--pack-destination', packageDir], projectRoot)
    const [archive] = await readdir(packageDir)
    const archivePath = path.join(packageDir, archive)

    await writeFile(path.join(consumerDir, 'package.json'), JSON.stringify({ name: 'smc-consumer', private: true, type: 'module' }))
    await runNpm(['install', '--no-audit', '--no-fund', '--package-lock=false', archivePath, 'react@^19.1.0'], consumerDir)
    const publicImport = await run(
      process.execPath,
      ['--input-type=module', '--eval', `import { defineConfig } from 'simple-mdx-canvas'; console.log(defineConfig({ theme: 'local' }).theme)`],
      consumerDir,
    )
    assert.equal(publicImport.stdout.trim(), 'local')

    const smc = path.join(consumerDir, 'node_modules', 'simple-mdx-canvas', 'dist', 'cli.js')
    await run(process.execPath, [smc, 'init'], consumerDir)
    await writeExtension(consumerDir)
    await writeFile(path.join(consumerDir, 'report.mdx'), '# Report\n\n<Badge value="ready" />\n')

    const listed = await run(process.execPath, [smc, 'list-components'], consumerDir)
    assert.match(listed.stdout, /Badge: Render a local badge\./)

    const validated = await run(process.execPath, [smc, 'validate', 'report.mdx'], consumerDir)
    assert.match(validated.stdout, /OK: validation passed\./)

    await run(process.execPath, [smc, 'render', 'report.mdx', '-o', 'report.html'], consumerDir)
    const html = await readFile(path.join(consumerDir, 'report.html'), 'utf8')
    assert.match(html, /Local: ready/)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
})

async function writeExtension(cwd: string): Promise<void> {
  const extensionDir = path.join(cwd, '.simple-mdx-canvas', 'components')
  await writeFile(path.join(extensionDir, 'label.ts'), `export const label = 'Local'\n`)
  await writeFile(path.join(extensionDir, 'badge.tsx'), `import { label } from './label.ts'\n\nexport default function Badge({ value }: { value: string }) {\n  return <strong className="local-badge">{label}: {value}</strong>\n}\n`)
  await writeFile(path.join(cwd, '.simple-mdx-canvas', 'components.manifest.ts'), `import Badge from './components/badge.tsx'\n\nexport default [{\n  name: 'Badge',\n  description: 'Render a local badge.',\n  component: Badge,\n  allowMarkdownChildren: false,\n}]\n`)
}

async function runNpm(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  await access(npmCli)
  return run(process.execPath, [npmCli, ...args], cwd)
}

function run(command: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with ${code}: ${stderr || stdout}`))
      }
    })
  })
}
