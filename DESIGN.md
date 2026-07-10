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

Represents one `.mdx` input file and its frontmatter.

### Component Registry

Maps component names to React components and schemas.

The registry includes built-ins and optional user components. Documents may use registered components but may not import arbitrary components in safe mode.

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

Local user extension through config directories and manifest files.

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

The CLI owns command parsing only. It delegates rendering, validation, config loading, and registry loading to `core/` modules.

## 5. Why Not a Documentation Framework

Documentation frameworks such as Docusaurus, Nextra, and Rspress solve multi-page site concerns: routing, navigation, layout, sidebars, plugins, and deployment.

`simple-mdx-canvas` solves a narrower problem: a single agent-generated document artifact that can be rendered with one command.

Therefore, the project avoids site concepts such as routes, sidebars, collections, and static site deployment.

## 6. MDX Safety Boundary

MDX is powerful because it compiles to JavaScript. That is also the risk.

The default safe mode blocks import/export, raw scripts/styles, inline event handlers, and unknown components. This is not a complete security sandbox, but it prevents the most common accidental escapes in agent-generated documents.

User component code is treated as trusted local code.

## 7. Component Design

Built-ins are intentionally small and report-oriented. Their source files are split by component family under `src/runtime/components/` so visual behavior does not accumulate in one monolithic runtime file:

```text
src/runtime/components/
  chart.tsx
  columns.tsx
  grid.tsx
  table.tsx
  tag.tsx
  callout.tsx
  cards.tsx
  tabs.tsx
  steps.tsx
  figure.tsx
  prompt-box.tsx
  html-block.tsx
  index.ts
```

Built-in purposes:

- `Chart`: thin Chart.js configuration pass-through;
- `Columns`: pure Bulma columns layout;
- `Grid`: Bulma fixed-grid layout;
- `Table`: Bulma table from JSON rows;
- `Tag`: Bulma tag for compact labels;
- `Callout`: highlighted constraints or conclusions;
- `Cards`: concept or option grouping;
- `Tabs`: grouped variants;
- `Steps`: process explanation;
- `Figure`: image with caption;
- `PromptBox`: copy-oriented prompt/command block;
- `HtmlBlock`: raw HTML fragment for Bulma snippets, embeds, and scripts.

`Chart` accepts a Chart.js configuration object. The component stays deep by delegating chart semantics to Chart.js instead of inventing a smaller parallel chart API.

`Columns` is deliberately shallow visually: it arranges children but does not add borders, backgrounds, or padding. Visual emphasis belongs in child components such as `Card`, `Callout`, or `Figure`.

## 8. Validation Design

Validation precedes evaluation. It performs:

- policy checks with source scanning;
- component existence checks;
- prop schema checks;
- MDX compile checks.

The validator emits stable error codes for agent repair loops.

Known MVP limitation: prop extraction is intentionally conservative and does not implement a full MDX AST attribute evaluator. That is acceptable for the initial safe subset but should be upgraded later by inspecting MDX AST nodes directly.

## 9. Theme Design

Bulma is the default design substrate. `simple-mdx-canvas` adds a small CSS layer from `src/styles/`.

Theme state has two axes:

```text
design theme: default | academic | compact | user theme
color mode: light | dark
```

The generated page includes a top toolbar with a light/dark toggle. Color mode is stored in `localStorage` and applied through Bulma-compatible `data-theme`.

Custom themes should override Bulma CSS variables directly. `--canvas-*` variables are reserved for canvas shell sizing and layout, not for replacing Bulma's component system.

## 10. Extension Design

The planned extension contract is:

```text
.simple-mdx-canvas/
  components/
  snippets/
  themes/
  components.manifest.ts
```

A component manifest exports component metadata and optional schemas. Duplicate component names are rejected.

## 11. Implementation Notes

The product contract is a standalone Node-compatible CLI package, not a Bun-only tool:

- TypeScript compiles to ESM JavaScript in `dist/`.
- `package.json` exposes executable bins: `simple-mdx-canvas` and `smc`.
- Published or linked output runs through Node after compilation.
- Bun may be used as an optional developer runtime, but users and agents should not be required to install Bun.

The implementation follows the code-quality rule used by the bundled engineering skills: public entry first, main flow before details, and comments only for contracts or non-obvious rationale.

## 12. Future Work

High-value next steps:

1. Replace regex-based JSX prop extraction with MDX AST inspection.
2. Add asset existence validation for `Figure`.
3. Add real local user component example.
4. Add optional self-contained asset bundling.
5. Add `Snippet` support for reusable MDX fragments.
6. Add tests for validation error codes.


## Math Pipeline

Math notation is part of the document language, not a component. The renderer enables `remark-math` and `rehype-katex` by default, then embeds KaTeX CSS into the generated HTML. Inline math uses `$...$`; display math uses `$$...$$`. The canvas stylesheet only adds overflow handling for wide display equations; KaTeX owns formula typography.
