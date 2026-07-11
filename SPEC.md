# simple-mdx-canvas SPEC

## 1. Product Definition

`simple-mdx-canvas` is an agent-facing single-page MDX canvas renderer.

It converts one `.mdx` document into a visual, report-ready HTML page using GFM-compatible Markdown, math notation, and controlled, extensible components.

The product serves agent workflows: an agent can write one MDX document, validate it, render it, and return a directly openable HTML artifact to the user.

## 2. Primary Use Cases

- Write a project summary that is easier to read than plain Markdown.
- Produce a technical report with charts, callouts, cards, columns, and figures.
- Generate a local HTML artifact for user review or presentation.
- Let an agent produce a visual explanation without creating a full React app or documentation site.

## 3. Non-goals

`simple-mdx-canvas` is not:

- a documentation site generator;
- a blog or CMS;
- a route manager;
- a full React application scaffold;
- a general untrusted MDX execution sandbox;
- a PPT/PDF generator;
- a visual editor.

## 4. Command Contract

The CLI must use a real command parser rather than handwritten flag scanning. The current implementation uses `commander`.

### `render`

```bash
simple-mdx-canvas render <input.mdx> -o <output.html>
```

Behavior:

1. Load config.
2. Load built-in and user-registered components.
3. Read the MDX document.
4. Validate MDX policy and component usage.
5. Render to a single HTML page.
6. Write the output file.
7. Exit.

### `validate`

```bash
simple-mdx-canvas validate <input.mdx>
```

Validates without producing HTML. This command is the default repair loop for agents.

### `serve`

```bash
simple-mdx-canvas serve <input.mdx> [--port 4321] [--open]
```

Serves the rendered page through a local HTTP server for manual preview. It is not the default agent delivery path because it occupies a process.

### `init`

```bash
simple-mdx-canvas init
```

Creates local config and extension directories.

### `list-components`

```bash
simple-mdx-canvas list-components
```

Lists available components and examples.

## 5. Document Model

Input is one `.mdx` file.

Frontmatter fields:

```yaml
title: string
description?: string
theme?: string
data?: DataDeclarations
```

`data` declares named data values that components can reuse via a `from` prop, so the same rows or chart configuration do not have to be duplicated across `<Table>` and `<Chart>`. Data is resolved at build time and embedded into the single HTML artifact; the rendered page does not fetch data at runtime.

Each declaration under `data` is an object with exactly-one-of `$src` / `$inline`, and an optional `$derive`:

```yaml
data:
  rows:
    $src: data/rows.json        # path relative to the .mdx file
  costCfg:
    $inline:                     # any YAML literal
      type: bar
      data:
        labels: [A, B]
        datasets:
          - { label: cost, data: [3, 5] }
  counts:
    $inline:
      - { name: a, count: 3 }
    $derive:
      onlyCounts: "r => r.map(x => x.count)"
```

`$derive` is a map of `{ name: "<lambda string>" }` where each lambda is `(input) => <plain value>`, evaluated synchronously in a constrained vm sandbox with a 200ms timeout. Canvas documents are trusted local inputs; the timeout limits accidental non-termination, but the sandbox is **not** an adversarial security boundary.

Consuming components accept a `from` string prop instead of their native data prop. A component declares which prop `from` resolves into (`Table` → `data`, `Chart` → `config`). `from` supports a small projection DSL: `X` (whole value), `X.f.g` (object path), `X[i]` (array index), `X[].f.g` (array extraction with null padding so output length equals source length). `from` and the native data prop are mutually exclusive.

The Markdown baseline is GFM-compatible Markdown. Fenced code blocks are syntax-highlighted when a language is provided. Plain text and Markdown-like code fences wrap by default. Math notation is enabled by default with `$...$` inline math and `$$...$$` display math. Components are written as JSX-like MDX tags but are restricted by the component registry.

## 6. Document Policy

Canvas documents are trusted local authoring inputs. JSX expressions and
`HtmlBlock` fragments may execute during rendering.

- Use registered components for capitalized component tags.
- Do not import components inside the document.
- Do not export variables or functions inside the document.
- Do not define inline components.
- Do not use direct raw `<script>` or `<style>` tags; use `HtmlBlock` for
  trusted HTML fragments or scripts.
- Do not use direct inline event handlers or `javascript:` links.

Registered component use:

```mdx
<Callout type="warning" title="Limit">
Markdown children are allowed here.
</Callout>

<Chart
  title="Cost comparison"
  config='{
    "type": "bar",
    "data": {
      "labels": ["A", "B"],
      "datasets": [
        { "label": "Cost", "data": [3.2, 5.8] }
      ]
    }
  }'
/>
```

Math syntax is not a component and does not require registry registration:

```mdx
Inline math: $C = C_{content} + C_{layout}$.

$$
\mathrm{Value} = \frac{\mathrm{clarity}}{\mathrm{cost}}
$$
```

## 7. Built-in Components

Built-in non-component rendering:

- Fenced code blocks — statically highlighted through `rehype-highlight`
- Math notation — parsed with `remark-math`, rendered with KaTeX, and styled through embedded KaTeX CSS

MVP components:

- `Chart` — visualization rendered from a Chart.js configuration object
- `Columns` / `Column` — pure Bulma columns layout only; visual emphasis belongs in child components
- `Grid` / `Cell` — Bulma fixed-grid layout
- `Table` — Bulma table from JSON rows
- `Tags` / `Tag` — Bulma tags
- `Callout`
- `Cards` / `Card`
- `Tabs` / `Tab` — Bulma tabs markup with a minimal static-page switcher
- `Figure`
- `PromptBox` — copy-oriented block for prompts, commands, and agent instructions; text must wrap by default
- `HtmlBlock` — raw HTML fragment for Bulma snippets, embeds, and scripts

The component set is deliberately small. Markdown remains the default representation; components are used only where they improve structure, visualization, or presentation value.

## 8. User Extensions

Users can register static TypeScript or TSX components through a local manifest.

Default extension location after `smc init`:

```text
.simple-mdx-canvas/
  components/
  themes/
  components.manifest.ts
  tsconfig.json
```

The config, manifest, and component modules are trusted local code. They may
use relative `.ts` or `.tsx` imports. The manifest default-exports an array;
every entry requires a capitalized name, non-empty description, and component
function. Built-in and user names share one registry, so any duplicate is an
error.

The generated extension `tsconfig.json` selects NodeNext and `react-jsx` for
that hidden directory. TSX extension projects must declare `react` as a direct
runtime dependency so the automatic JSX runtime resolves from component source.
Static components may accept Markdown children only when
`allowMarkdownChildren` is true. They render into the HTML artifact without
browser hydration.

MDX documents remain content artifacts and must not import arbitrary code
 directly.

## 9. Theme System

Bulma CSS is the default visual substrate. The project-specific stylesheet must stay small and own only canvas-specific behavior: page shell, toolbar, chart sizing, and print behavior. Custom themes should override Bulma CSS variables directly; `--canvas-*` variables are reserved for canvas shell sizing and layout only.

Theme state has two axes:

```text
design theme: default or a local theme name
color mode: light | dark
```

Every rendered HTML page includes a top toolbar with a light/dark toggle. The toggle is client-side only, must not require a server, and must update Bulma-compatible `data-theme`.

Resolution order:

```text
Bulma CSS
  < canvas CSS
  < local user theme CSS
  < document frontmatter / CLI override
```

The MVP theme system exposes page width, chart accent, shell behavior, and local theme CSS overrides. General typography and primitives come from Bulma.

## 10. Render Targets

### HTML file

The default target is a directly openable HTML file. Renderer-owned CSS and
scripts are embedded; document-authored URLs remain unchanged and resolve
relative to the generated HTML file.

### Serve

The serve target renders the current file through a local server for preview. It does not change document semantics.

## 11. Validation and Error Model

Validation must produce stable, agent-readable errors.

Required error categories:

- `SMC_MDX_PARSE`
- `SMC_FORBIDDEN_IMPORT`
- `SMC_FORBIDDEN_EXPORT`
- `SMC_FORBIDDEN_RAW_HTML`
- `SMC_FORBIDDEN_INLINE_JS`
- `SMC_UNKNOWN_COMPONENT`
- `SMC_COMPONENT_SCHEMA`
- `SMC_FORBIDDEN_CHILDREN`
- `SMC_MISSING_ASSET`
- `SMC_UNKNOWN_DATA`
- `SMC_DATA_REDECLARED`
- `SMC_INVALID_DATA_NAME`
- `SMC_INVALID_PROJECTION`
- `SMC_DATA_TRANSFORM_ERROR`
- `SMC_DATA_SOURCE_CONFLICT`
- `SMC_INVALID_DATA_SOURCE`

Error output should include file, line, component, prop, message, and fix guidance when possible.

## 12. Trust Model

Canvas documents, local component code, and `$derive` lambdas are trusted local
inputs. The renderer does not provide an adversarial MDX or JavaScript sandbox.

- Document-level ESM is excluded from the language; reusable code belongs in
  registered local components.
- Frontmatter `$inline` and `$src` resolve at build time. `$derive` runs in a
  constrained vm with a 200 ms timeout to limit accidental host access and
  non-termination, not to isolate an adversary.
- Direct document scripts, styles, event handlers, and `javascript:` links are
  excluded from the language. `HtmlBlock` is the explicit trusted HTML/script
  escape hatch.

## 13. MVP Scope

Included:

- CLI commands: `render`, `validate`, `serve`, `init`, `list-components`.
- Built-in components listed above.
- CSS-variable theme system.
- Local config and manifest discovery.
- Single HTML output.
- Agent-readable validation errors.

Deferred:

- multi-page site generation;
- PDF/PPT export;
- plugin marketplace;
- remote components;
- sandboxed execution;
- full client hydration architecture;
- visual editing.
