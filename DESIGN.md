# simple-mdx-canvas DESIGN

## 1. Design Thesis

The system is a thin single-page renderer, not a documentation framework.

The implementation reuses mature ecosystem primitives:

- MDX compiler for Markdown + JSX parsing and evaluation;
- remark-gfm, remark-math, rehype-katex, and rehype-highlight for GFM Markdown support, math, and fenced code highlighting;
- React server rendering for HTML output;
- Bulma CSS for stable visual primitives;
- a local component registry for controlled MDX components;
- a CLI-first workflow for agents.

The dominant design pressure is agent usability: an agent should write one `.mdx`, run one deterministic CLI command, and return one HTML artifact.

## 2. Core Abstractions

```text
Document
Component Registry
Theme
Renderer
Target
Extension
Validator
```

### Document

Represents one `.mdx` input file and its frontmatter, including optional `data:` declarations resolved at build time by `document-data.ts`.

### Component Registry

Maps component names to React components and schemas.

The registry includes built-ins and optional user components. Documents may use
registered components; document-level ESM imports are not part of the document
language.

### Theme

Provides CSS variables and local theme overrides. Themes do not change document structure.

Bulma is the base visual layer. Project CSS only owns canvas-specific decisions: page shell, toolbar, chart sizing, and print behavior.

### Renderer

Compiles and evaluates MDX, renders the resulting component tree to static HTML, and injects CSS and small runtime scripts.

### Target

Defines delivery mode:

- `render`: write HTML and exit;
- `serve`: local preview server.

### Extension

Trusted local config, manifest, and static component modules loaded through one
TypeScript/TSX compilation boundary. Document MDX cannot import extension code.

### Validator

Performs static policy checks before MDX evaluation.

## 3. Render Pipeline

```text
loadConfig()
  -> loadRegistry()
  -> loadDocument()
  -> validateDocument()
  -> evaluate MDX
  -> render React to static HTML
  -> load Bulma + canvas + local theme CSS
  -> build HTML shell
  -> write output
```

The renderer currently prioritizes static HTML. Components should avoid requiring React client hydration unless strictly necessary.

## 4. CLI Design

The CLI uses `commander`, not handwritten flag parsing.

Public commands:

```bash
smc render <input.mdx> -o <output.html>
smc validate <input.mdx>
smc serve <input.mdx> [--port 4321] [--open]
smc init
smc list-components
```

The CLI owns command parsing only. It delegates configuration, component
registry, document semantics, and rendering to their ownership modules.

## 5. Why Not a Documentation Framework

Documentation frameworks such as Docusaurus, Nextra, and Rspress solve multi-page site concerns: routing, navigation, layout, sidebars, plugins, and deployment.

`simple-mdx-canvas` solves a narrower problem: a single agent-generated document artifact that can be rendered with one command.

Therefore, the project avoids site concepts such as routes, sidebars, collections, and static site deployment.

## 6. Document Trust Boundary

Canvas documents are trusted local authoring inputs. JSX expressions,
`HtmlBlock`, and `$derive` may execute during rendering; this project does not
provide an adversarial MDX or JavaScript sandbox.

The document language excludes ESM import/export, direct scripts/styles, direct
inline event handlers, and `javascript:` links. Reusable code belongs in local
registered components; trusted HTML fragments and scripts belong in `HtmlBlock`.

## 7. Component Design

Built-ins are intentionally small and report-oriented. Their source files are split by component family under `src/components/built-ins/` so visual behavior does not accumulate in one monolithic runtime file:

```text
src/components/built-ins/
  chart.tsx
  columns.tsx
  grid.tsx
  table.tsx
  tag.tsx
  callout.tsx
  cards.tsx
  tabs.tsx
  figure.tsx
  prompt-box.tsx
  html-block.tsx
  index.ts
```

Built-in purposes:

- `Chart`: thin Chart.js configuration pass-through;
- `Columns`: pure Bulma columns layout;
- `Grid`: Bulma fixed-grid layout;
- `Table`: Bulma table from JSON rows with optional column labels and alignment;
- `Tag`: Bulma tag for compact labels;
- `Callout`: highlighted constraints or conclusions;
- `Cards`: concept or option grouping;
- `Tabs`: grouped variants;
- `Figure`: image with caption;
- `PromptBox`: copy-oriented prompt/command block;
- `HtmlBlock`: raw HTML fragment for Bulma snippets, embeds, and scripts.

`Chart` accepts a Chart.js configuration object. The component stays deep by delegating chart semantics to Chart.js instead of inventing a smaller parallel chart API. Both `Chart` and `Table` accept a `from` prop resolved from frontmatter `data:` declarations; `manifest.dataProp` declares which native prop the resolved value is injected into, so the data-source mechanism is general without each component implementing it.

Frontmatter data sources live in `src/document/data.ts`, a deep module exposing
only `resolveDocumentData` and `resolveFrom`. Source resolution (`$src` file
load, `$inline` literal), identifier and namespace checks, the `$derive`
sandbox, and the projection DSL parser are private to it. Both validation and
render preparation use the same `DocumentAnalysis`, so MDX structure and data
semantics are defined once.

`Columns` is deliberately shallow visually: it arranges children but does not add borders, backgrounds, or padding. Visual emphasis belongs in child components such as `Card`, `Callout`, or `Figure`.

## 8. Validation Design

Validation precedes evaluation. `src/document/analysis.ts` parses MDX once and
supplies component nodes, attributes, positions, and document ESM nodes to both
validation and render preparation. Validation performs:

- document-language policy checks;
- component existence checks;
- prop schema checks;
- MDX compile checks.

The validator emits stable error codes for agent repair loops. Rendering uses
the same analysis for byte-exact `from` replacement, so validation and rendering
cannot interpret component syntax through different parsers.

## 9. Theme Design

Bulma is the default design substrate. `simple-mdx-canvas` adds a small CSS layer from `src/styles/`.

Theme state has two axes:

```text
design theme: default | local theme name
color mode: light | dark
```

The generated page includes a top toolbar with a light/dark toggle. Color mode is stored in `localStorage` and applied through Bulma-compatible `data-theme`.

Custom themes should override Bulma CSS variables directly. `--canvas-*` variables are reserved for canvas shell sizing and layout, not for replacing Bulma's component system.

## 10. Extension Design

The extension boundary is `src/extensions/load-module.ts`. It owns supported
file extensions, Windows-safe file URL conversion, `tsx` registration, and
module-load diagnostics. `config.ts` and `components/registry.ts` must call
that boundary rather than importing local source modules themselves.

`smc init` creates the extension-local TypeScript configuration:

```text
.simple-mdx-canvas/
  components/
  themes/
  components.manifest.ts
  tsconfig.json
```

The local `tsconfig.json` is deliberate: `tsx` excludes dot-directories from
its default glob, so a TSX manifest or component under `.simple-mdx-canvas/`
must be compiled with an explicit configuration. Keeping it inside the
extension directory avoids changing an authoring project's root TypeScript
configuration.

The manifest default-exports static component metadata. Duplicate component
names are rejected before MDX evaluation. The loader accepts `.ts`, `.tsx`,
`.js`, and `.mjs`; relative imports resolve from extension source. Browser
bundling and hydration are not part of this boundary.

## 11. Implementation Notes

The product contract is a standalone Node-compatible CLI package, not a Bun-only tool:

- TypeScript compiles to ESM JavaScript in `dist/`.
- `package.json` exposes executable bins: `simple-mdx-canvas` and `smc`.
- Published or linked output runs through Node after compilation.
- Bun may be used as an optional developer runtime, but users and agents should not be required to install Bun.

The implementation follows the code-quality rule used by the bundled engineering skills: public entry first, main flow before details, and comments only for contracts or non-obvious rationale.

## Math Pipeline

Math notation is part of the document language, not a component. The renderer enables `remark-math` and `rehype-katex` by default, then embeds KaTeX CSS into the generated HTML. Inline math uses `$...$`; display math uses `$$...$$`. The canvas stylesheet only adds overflow handling for wide display equations; KaTeX owns formula typography.
