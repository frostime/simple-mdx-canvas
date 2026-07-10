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
layout?: document | report
```

The Markdown baseline is GFM-compatible Markdown. Fenced code blocks are syntax-highlighted when a language is provided. Plain text and Markdown-like code fences wrap by default. Math notation is enabled by default with `$...$` inline math and `$$...$$` display math. Components are written as JSX-like MDX tags but are restricted by the component registry.

## 6. Component Policy

Default policy:

- Use registered components only.
- Do not import components inside the document.
- Do not export variables or functions inside the document.
- Do not define inline components.
- Do not use raw `<script>` or `<style>` tags.
- Do not use inline event handlers or `javascript:` links.

Allowed in safe mode:

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

Users can register custom TSX components through a local manifest.

Default extension location:

```text
.simple-mdx-canvas/
  components/
  snippets/
  themes/
  components.manifest.ts
```

User components are local trusted code. MDX documents remain content artifacts and should not import arbitrary code directly.

## 9. Theme System

Bulma CSS is the default visual substrate. The project-specific stylesheet must stay small and own only canvas-specific behavior: page shell, toolbar, chart sizing, and print behavior. Custom themes should override Bulma CSS variables directly; `--canvas-*` variables are reserved for canvas shell sizing and layout only.

Theme state has two axes:

```text
design theme: default | academic | compact | user theme
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

The default target is a self-contained HTML file.

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
- `SMC_MISSING_ASSET` (planned)
- `SMC_UNKNOWN_THEME` (planned)

Error output should include file, line, component, prop, message, and fix guidance when possible.

## 12. Security Model

Default mode treats MDX as content, not code.

- MDX documents are restricted.
- Component implementations are trusted local code.
- Full MDX power can be enabled with `--trusted-mdx`, but agent workflows should not use it by default.

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
