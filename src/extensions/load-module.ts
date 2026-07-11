import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { register, type NamespacedUnregister } from 'tsx/esm/api'

const supportedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs'])
const extensionLoaders = new Map<string, NamespacedUnregister>()

type ExtensionModule = Record<string, unknown>

export async function loadExtensionModule(file: string, projectRoot: string): Promise<ExtensionModule> {
  const extension = path.extname(file)
  if (!supportedExtensions.has(extension)) {
    throw new Error(`Unsupported extension module "${file}". Use .ts, .tsx, .js, or .mjs.`)
  }

  try {
    return normalizeModule(await extensionLoaderFor(projectRoot).import(
      pathToFileURL(file).href,
      import.meta.url,
    ) as ExtensionModule)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to load extension module "${file}": ${detail}`, { cause: error })
  }
}

function extensionLoaderFor(projectRoot: string): NamespacedUnregister {
  const tsconfig = path.join(projectRoot, '.simple-mdx-canvas', 'tsconfig.json')
  const key = existsSync(tsconfig) ? tsconfig : projectRoot
  const existing = extensionLoaders.get(key)
  if (existing) return existing

  const loader = register({
    namespace: `simple-mdx-canvas-extensions-${extensionLoaders.size}`,
    tsconfig: existsSync(tsconfig) ? tsconfig : false,
  })
  extensionLoaders.set(key, loader)
  return loader
}

function normalizeModule(module: ExtensionModule): ExtensionModule {
  const defaultExport = module.default
  if (!isDefaultInteropWrapper(defaultExport)) return module

  return { ...module, default: defaultExport.default }
}

function isDefaultInteropWrapper(value: unknown): value is { default: unknown } {
  if (typeof value !== 'object' || value === null) return false
  if (Object.keys(value).length !== 1 || !Object.hasOwn(value, 'default')) return false

  return typeof Object.getOwnPropertyDescriptor(value, 'default')?.get === 'function'
}
