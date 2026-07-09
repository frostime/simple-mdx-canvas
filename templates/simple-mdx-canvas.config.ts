import { defineConfig } from 'simple-mdx-canvas'

export default defineConfig({
  theme: 'default',
  components: {
    manifest: '.simple-mdx-canvas/components.manifest.ts'
  },
  snippets: {
    localDir: '.simple-mdx-canvas/snippets'
  },
  themes: {
    localDir: '.simple-mdx-canvas/themes'
  },
  output: {
    selfContained: true
  },
  mdx: {
    gfm: true,
    math: true,
    allowImports: false,
    allowExports: false,
    allowRawHtml: false
  }
})
