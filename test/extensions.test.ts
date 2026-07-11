import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { loadRegistry } from '../src/components/registry.ts'
import { defaultConfig } from '../src/config.ts'

async function withManifest(source: string, run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), 'smc-extension-'))
  const manifest = path.join(dir, 'components.manifest.ts')
  await writeFile(manifest, source)

  try {
    await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('registry reports the manifest file when a user component duplicates a built-in', async () => {
  await withManifest(
    `export default [{ name: 'Chart', description: 'duplicate', component: () => null }]\n`,
    async (dir) => {
      const manifest = path.join(dir, 'components.manifest.ts')
      await assert.rejects(
        () => loadRegistry({ ...defaultConfig, components: { manifest } }, dir),
        new RegExp(`Duplicate component name "Chart" in "${escapeRegExp(manifest)}"`),
      )
    },
  )
})

test('registry rejects a manifest that does not export an array', async () => {
  await withManifest(`export default { name: 'Badge' }\n`, async (dir) => {
    const manifest = path.join(dir, 'components.manifest.ts')
    await assert.rejects(
      () => loadRegistry({ ...defaultConfig, components: { manifest } }, dir),
      new RegExp(`Component manifest "${escapeRegExp(manifest)}" must default export an array`),
    )
  })
})

test('registry reports the manifest file when extension evaluation fails', async () => {
  await withManifest(`throw new Error('extension setup failed')\n`, async (dir) => {
    const manifest = path.join(dir, 'components.manifest.ts')
    await assert.rejects(
      () => loadRegistry({ ...defaultConfig, components: { manifest } }, dir),
      new RegExp(`Failed to load extension module "${escapeRegExp(manifest)}": extension setup failed`),
    )
  })
})

test('registry rejects manifest entries without a component function', async () => {
  await withManifest(`export default [{ name: 'Badge', description: 'badge' }]\n`, async (dir) => {
    const manifest = path.join(dir, 'components.manifest.ts')
    await assert.rejects(
      () => loadRegistry({ ...defaultConfig, components: { manifest } }, dir),
      new RegExp(`Component manifest "${escapeRegExp(manifest)}" entry "Badge" needs a component function`),
    )
  })
})

test('registry rejects manifest entries with a non-Zod schema', async () => {
  await withManifest(`export default [{ name: 'Badge', description: 'badge', component: () => null, schema: {} }]\n`, async (dir) => {
    const manifest = path.join(dir, 'components.manifest.ts')
    await assert.rejects(
      () => loadRegistry({ ...defaultConfig, components: { manifest } }, dir),
      new RegExp(`Component manifest "${escapeRegExp(manifest)}" entry "Badge" has an invalid schema`),
    )
  })
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
