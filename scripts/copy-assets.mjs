import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
await mkdir(path.join(root, 'dist', 'styles'), { recursive: true })
await cp(path.join(root, 'src', 'styles'), path.join(root, 'dist', 'styles'), { recursive: true })
