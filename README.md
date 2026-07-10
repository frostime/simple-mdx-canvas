# simple-mdx-canvas

`simple-mdx-canvas` is an agent-facing single-page MDX canvas renderer.

It lets an agent write one `.mdx` document with GFM Markdown, math notation, and controlled visual components, then render it into a directly openable HTML artifact.

## Install

`simple-mdx-canvas` is a normal Node-compatible CLI package. Bun is optional and not part of the user-facing contract.

Local development:

```bash
npm install
npm run build
```

During development you can call the TypeScript source through `tsx`:

```bash
npm run dev -- validate examples/report.mdx
npm run dev -- render examples/report.mdx -o examples/report.html
npm run dev -- serve examples/report.mdx --port 4321 --open
```

After build:

```bash
node dist/cli.js validate examples/report.mdx
node dist/cli.js render examples/report.mdx -o examples/report.html
```

As an installed CLI:

```bash
npm link
smc validate examples/report.mdx
smc render examples/report.mdx -o examples/report.html
```

## Commands

```bash
smc render <input.mdx> -o <output.html>
smc validate <input.mdx>
smc serve <input.mdx> [--port 4321] [--open]
smc init
smc list-components
```

The CLI is implemented with `commander`; command parsing is centralized in `src/cli.ts` rather than handwritten flag scanning.

## Styling

The rendered HTML embeds Bulma CSS plus a small `simple-mdx-canvas` style layer from `src/styles/`.

Design rules:

- Bulma handles ordinary document UI primitives such as messages, cards, buttons, columns, grids, tables, tags, tabs, and content typography.
- `simple-mdx-canvas` CSS only fills canvas-specific gaps: page shell, sticky toolbar, chart sizing, and print behavior.
- Custom themes should override Bulma CSS variables directly, with optional `--canvas-*` variables for page-shell sizing.
- `Columns` and `Grid` are layout components. They do not add card backgrounds, borders, or padding to each child.
- Every generated page includes a top toolbar with a light/dark toggle. The toggle updates Bulma-compatible `data-theme` and stores the choice in `localStorage`.

## Safe MDX Policy

Default agent mode is restricted:

- no MDX imports;
- no MDX exports;
- no inline component definitions;
- no raw `<script>` or `<style>` tags;
- only registered components may be used.

Use `--trusted-mdx` only for local trusted documents.

## Built-in Components

Math support is enabled by default through `remark-math`, `rehype-katex`, and embedded KaTeX CSS. Built-in component implementations are split under `src/runtime/components/`, one component family per file. The registry imports them from `src/runtime/components/index.ts`.

- Math notation — `$inline$` and `$$block$$`, rendered with KaTeX
- `Chart` — rendered with Chart.js
- `Columns` / `Column`
- `Grid` / `Cell`
- `Table`
- `Tags` / `Tag`
- `Callout`
- `Cards` / `Card`
- `Tabs` / `Tab`
- `Steps` / `Step`
- `Figure`
- `PromptBox` — copy-oriented prompt block; long text and fenced code wrap by default
- Fenced code blocks — statically highlighted when a language is provided, for example ```` ```ts ````
- `HtmlBlock` — safe or trusted raw HTML fragment for small Bulma-based snippets

## Example

```mdx
---
title: "Project Report"
theme: "academic"
---

# Project Report

<Callout type="summary" title="Decision">
Use `simple-mdx-canvas` when the output should be more visual than Markdown but lighter than a frontend project.
</Callout>

Inline math works: $C = C_{content} + C_{layout} + C_{runtime}$.

$$
\mathrm{Value} = \frac{\mathrm{visual\ clarity}}{\mathrm{setup\ cost}}
$$

<Chart
  type="bar"
  title="Rendering options"
  x="option"
  y="complexity"
  data='[
    { "option": "Markdown", "complexity": 1 },
    { "option": "MDX Canvas", "complexity": 3 },
    { "option": "Full app", "complexity": 8 }
  ]'
/>
```

## Documentation

- [`SPEC.md`](./SPEC.md)
- [`DESIGN.md`](./DESIGN.md)
- [`docs/TECH_ROUTE.md`](./docs/TECH_ROUTE.md)

## Agent Skill

This scaffold includes an embedded agent skill at:

```text
skills/write-mdx-canvas/SKILL.md
```
