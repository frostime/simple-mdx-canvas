#!/usr/bin/env node
import { Command, Option } from 'commander'
import { createServer } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { loadConfig } from './config.js'
import { loadRegistry, listComponentManifests } from './components/registry.js'
import { loadDocument } from './document/source.js'
import { validateDocument } from './document/validate.js'
import { formatValidationErrors } from './document/errors.js'
import { renderToHtml } from './render/render-document.js'

const cwd = process.cwd()
const packageVersion = (createRequire(import.meta.url)('../package.json') as { version: string }).version

const program = new Command()
  .name('simple-mdx-canvas')
  .alias('smc')
  .description('Render one controlled MDX document into a visual HTML canvas.')
  .version(packageVersion)

program
  .command('render')
  .description('Render one .mdx document to an HTML file and exit.')
  .argument('<input>', 'input .mdx file')
  .requiredOption('-o, --output <file>', 'output .html file')
  .option('--theme <name>', 'override the document theme')
  .action(async (input: string, options: RenderCommandOptions) => {
    const result = await renderToHtml({
      input,
      output: options.output,
      cwd,
      theme: options.theme,
    })
    console.log(`Rendered: ${result.output}`)
  })

program
  .command('validate')
  .description('Validate one .mdx document without rendering it.')
  .argument('<input>', 'input .mdx file')
  .action(async (input: string) => {
    const config = await loadConfig(cwd)
    const registry = await loadRegistry(config, cwd)
    const document = await loadDocument(path.resolve(cwd, input))
    const result = await validateDocument(document, registry, config)

    if (!result.ok) {
      console.error(formatValidationErrors(result.errors))
      process.exitCode = 1
      return
    }

    console.log('OK: validation passed.')
  })

program
  .command('serve')
  .description('Serve one .mdx document through a local preview server.')
  .argument('<input>', 'input .mdx file')
  .addOption(new Option('--port <number>', 'local preview port').default('4321'))
  .option('--open', 'open the preview URL in the default browser', false)
  .action(async (input: string, options: ServeCommandOptions) => {
    const port = Number(options.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid --port value: ${options.port}`)
    }

    const server = createServer(async (_req, res) => {
      try {
        const result = await renderToHtml({ input, cwd })
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end(result.html)
      } catch (err) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
        res.end(err instanceof Error ? err.message : String(err))
      }
    })

    server.listen(port, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${port}`
      console.log(`Serving ${input} at ${url}`)
      if (options.open) openUrl(url)
    })
  })

program
  .command('init')
  .description('Create local config and extension folders.')
  .action(async () => {
    const root = path.resolve(cwd, '.simple-mdx-canvas')
    await mkdir(path.join(root, 'components'), { recursive: true })
    await mkdir(path.join(root, 'themes'), { recursive: true })

    const configPath = path.resolve(cwd, 'simple-mdx-canvas.config.ts')
    if (!existsSync(configPath)) {
      await writeFile(configPath, defaultConfigTemplate(), 'utf8')
    }

    const manifestPath = path.join(root, 'components.manifest.ts')
    if (!existsSync(manifestPath)) {
      await writeFile(manifestPath, 'export default []\n', 'utf8')
    }

    console.log(`Initialized ${root}`)
  })

program
  .command('list-components')
  .description('List registered components and their first example, when available.')
  .action(async () => {
    const config = await loadConfig(cwd)
    const registry = await loadRegistry(config, cwd)

    for (const manifest of listComponentManifests(registry)) {
      console.log(`- ${manifest.name}: ${manifest.description}`)
      if (manifest.examples?.length) console.log(`  example: ${manifest.examples[0]}`)
    }
  })

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})

type RenderCommandOptions = {
  output: string
  theme?: string
}

type ServeCommandOptions = {
  port: string
  open: boolean
}

function openUrl(url: string) {
  const platform = process.platform
  const command = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open'
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]
  spawn(command, args, { detached: true, stdio: 'ignore' }).unref()
}

function defaultConfigTemplate(): string {
  return `import { defineConfig } from 'simple-mdx-canvas'\n\nexport default defineConfig({\n  theme: 'default',\n  components: {\n    manifest: '.simple-mdx-canvas/components.manifest.ts'\n  },\n  themes: {\n    localDir: '.simple-mdx-canvas/themes'\n  }\n})\n`
}
