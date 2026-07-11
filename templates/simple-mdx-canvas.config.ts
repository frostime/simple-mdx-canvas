import { defineConfig } from 'simple-mdx-canvas'

export default defineConfig({
  theme: 'default',
  components: {
    manifest: '.simple-mdx-canvas/components.manifest.ts',
  },
  themes: {
    localDir: '.simple-mdx-canvas/themes',
  },
})
