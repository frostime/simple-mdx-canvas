# Extension Module Specification

`src/extensions/` owns execution of trusted local extension modules. It is the
only boundary for loading TypeScript, TSX, JavaScript, and MJS config,
manifest, and component modules.

## Required Contract

- `/src/config.ts` and `/src/components/registry.ts` must use
  `loadExtensionModule`; they must not directly dynamic-import local extension
  source.
- Accepted entry extensions are `.ts`, `.tsx`, `.js`, and `.mjs`. Errors must
  identify the source module path and preserve the underlying diagnostic.
- Loader registration is scoped to the authoring project. It must use that
  project's `.simple-mdx-canvas/tsconfig.json` when present.
- `smc init` owns the generated extension `tsconfig.json`. Its `react-jsx`
  configuration is required because `tsx` excludes dot-directories from its
  default glob. Do not move that configuration to the project root: the
  extension compiler must not alter unrelated TypeScript project settings.
- TSX extensions require `react` as a direct dependency of the authoring
  project. The renderer and extension component must resolve the same package
  instance.

The extension code trust boundary is separate from document policy: trusted
extension modules may import local code; MDX documents may not use ESM imports.

## Change Rules

Changing the loader, generated extension configuration, module extensions, or
manifest discovery requires the installed-tarball test to cover the changed
path. Preserve static server rendering; browser bundling or hydration belongs
to the later interactive-component work.
